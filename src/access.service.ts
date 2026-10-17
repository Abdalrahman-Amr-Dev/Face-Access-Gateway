import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { FacePresenceClient } from './face-services/clients/face-presence.client.js';
import { FaceRecognitionClient } from './face-services/clients/face-recognition.client.js';

const PENDING_LIFETIME_MS = 5 * 60 * 1000;
const MAX_PENDING_EVENTS = 20;

@Injectable()
export class AccessService {
  private readonly clients = new Set<WebSocket>();
  private readonly pending = new Map<
    string,
    {
      faceId: string;
      expiresAt: number;
      deciding: boolean;
      notification: Record<string, unknown>;
    }
  >();

  constructor(
    private readonly presence: FacePresenceClient,
    private readonly recognition: FaceRecognitionClient,
  ) {}

  connect(client: WebSocket) {
    this.clients.add(client);
    this.prune();
    for (const entry of this.pending.values()) {
      this.send(client, 'face.unknown', entry.notification);
    }
  }

  disconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  async process(image: Buffer, mimeType: string) {
    if (!(await this.presence.detect(image, mimeType))) {
      return { status: 'no_face' };
    }
    const result = await this.recognition.verify(image, mimeType);
    if (result.status !== 'unknown') return { status: result.status };
    if (typeof result.face_id !== 'string' || !result.face_id.trim()) {
      return { status: 'unknown', decisionAvailable: false };
    }
    this.prune();
    if (this.pending.size >= MAX_PENDING_EVENTS) {
      throw new Error(
        'Too many pending decisions; resolve an event before sending more images',
      );
    }
    const eventId = randomUUID();
    const expiresAt = Date.now() + PENDING_LIFETIME_MS;
    const notification = {
      eventId,
      face_id: result.face_id,
      imageBase64: image.toString('base64'),
      mimeType,
      expiresAt,
    };
    this.pending.set(eventId, {
      faceId: result.face_id,
      expiresAt,
      deciding: false,
      notification,
    });
    this.broadcast('face.unknown', notification);
    return { status: 'unknown', eventId, decisionAvailable: true };
  }

  async decide(payload: unknown) {
    if (!payload || typeof payload !== 'object')
      throw new Error('Decision must be an object');
    const { eventId, action, name, reason } = payload as Record<
      string,
      unknown
    >;
    if (
      typeof eventId !== 'string' ||
      (action !== 'allow' &&
        action !== 'prevent' &&
        action !== 'trust' &&
        action !== 'block')
    ) {
      throw new Error(
        'eventId and action (allow, prevent, trust or block) are required',
      );
    }
    if (
      ((action === 'trust' || action === 'block') && name === undefined) ||
      (name !== undefined &&
        (typeof name !== 'string' || !name.trim() || name.length > 100))
    ) {
      throw new Error('name must contain 1–100 characters');
    }
    if (
      reason !== undefined &&
      (typeof reason !== 'string' || reason.length > 500)
    ) {
      throw new Error('reason must be a string of at most 500 characters');
    }
    this.prune();
    const entry = this.pending.get(eventId);
    if (!entry) throw new Error('Unknown or expired event ID');
    if (entry.deciding) throw new Error('Decision is already processing');
    entry.deciding = true;
    try {
      if (action === 'trust')
        await this.recognition.trust(entry.faceId, (name as string).trim());
      else if (action === 'block')
        await this.recognition.block(
          entry.faceId,
          (name as string).trim(),
          (reason as string | undefined) ?? 'Blocked by operator',
        );
      this.pending.delete(eventId);
      const result = { eventId, action };
      this.broadcast('decision.applied', result);
      return result;
    } catch (error) {
      entry.deciding = false;
      throw error;
    }
  }

  private prune() {
    for (const [id, entry] of this.pending) {
      if (!entry.deciding && entry.expiresAt <= Date.now())
        this.pending.delete(id);
    }
  }

  private broadcast(event: string, data: unknown) {
    for (const client of this.clients) this.send(client, event, data);
  }

  private send(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify({ event, data }));
  }
}
