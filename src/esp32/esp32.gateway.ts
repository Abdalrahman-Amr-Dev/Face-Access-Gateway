import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { MAX_IMAGE_SIZE } from '../face-services/consts/max-image-size.const.js';
import { AccessService } from '../access.service.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

export interface Esp32ImageMessage {
  imageBase64: string;
  mimeType?: string;
}

@WebSocketGateway({
  path: '/ws/esp32',
  maxPayload: Math.ceil(MAX_IMAGE_SIZE / 3) * 4 + 1024,
})
export class Esp32Gateway {
  constructor(private readonly access: AccessService) {}

  private readonly processing = new WeakSet<WebSocket>();

  @SubscribeMessage('image')
  async receiveImage(
    @MessageBody() payload: unknown,
    @ConnectedSocket() client: WebSocket,
  ) {
    if (this.processing.has(client)) {
      return {
        event: 'image.rejected',
        data: { reason: 'Previous image is still processing' },
      };
    }
    this.processing.add(client);
    try {
      const image = this.validateAndDecode(payload);
      return {
        event: 'image.result',
        data: await this.access.process(image.buffer, image.mimeType),
      };
    } catch (error) {
      return {
        event: 'image.rejected',
        data: {
          reason: error instanceof Error ? error.message : 'Invalid image',
        },
      };
    } finally {
      this.processing.delete(client);
    }
  }

  private validateAndDecode(payload: unknown): {
    buffer: Buffer;
    mimeType: string;
  } {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Message data must be an object');
    }

    const message = payload as Partial<Esp32ImageMessage>;
    if (typeof message.imageBase64 !== 'string' || !message.imageBase64) {
      throw new Error('imageBase64 is required');
    }

    const mimeType = message.mimeType ?? 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error('Only image/jpeg and image/png are supported');
    }
    if (message.imageBase64.length > Math.ceil(MAX_IMAGE_SIZE / 3) * 4) {
      throw new Error('Image must be 5 MB or smaller');
    }
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        message.imageBase64,
      )
    ) {
      throw new Error('imageBase64 must be valid base64');
    }

    const buffer = Buffer.from(message.imageBase64, 'base64');
    if (buffer.length === 0) throw new Error('Image cannot be empty');
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error('Image must be 5 MB or smaller');
    }
    return { buffer, mimeType };
  }
}
