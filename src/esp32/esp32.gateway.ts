import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

export interface Esp32ImageMessage {
  imageBase64: string;
  mimeType?: string;
}

@WebSocketGateway({ path: '/ws/esp32' })
export class Esp32Gateway {
  @SubscribeMessage('image')
  receiveImage(
    @MessageBody() payload: unknown,
    @ConnectedSocket() _client: WebSocket,
  ) {
    try {
      const image = this.validateAndDecode(payload);
      return {
        event: 'image.accepted',
        data: { bytes: image.buffer.length, mimeType: image.mimeType },
      };
    } catch (error) {
      return {
        event: 'image.rejected',
        data: {
          reason: error instanceof Error ? error.message : 'Invalid image',
        },
      };
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
    if (!message.imageBase64) {
      throw new Error('imageBase64 is required');
    }

    const mimeType = message.mimeType ?? 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error('Only image/jpeg and image/png are supported');
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(message.imageBase64)) {
      throw new Error('imageBase64 must be valid base64');
    }

    const buffer = Buffer.from(message.imageBase64, 'base64');
    if (buffer.length === 0) throw new Error('Image cannot be empty');
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error('Image must be 5 MB or smaller');
    }
    return { buffer, mimeType };
  }
}
