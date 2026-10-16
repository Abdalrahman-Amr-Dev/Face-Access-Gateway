import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { AccessService } from '../access.service.js';

@WebSocketGateway({ path: '/ws/frontend', maxPayload: 4096 })
export class FrontendGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly access: AccessService) {}

  handleConnection(client: WebSocket) {
    this.access.connect(client);
  }
  handleDisconnect(client: WebSocket) {
    this.access.disconnect(client);
  }

  @SubscribeMessage('decision')
  async decide(
    @MessageBody() payload: unknown,
    @ConnectedSocket() _client: WebSocket,
  ) {
    try {
      return {
        event: 'decision.accepted',
        data: await this.access.decide(payload),
      };
    } catch (error) {
      return {
        event: 'decision.rejected',
        data: {
          eventId:
            payload && typeof payload === 'object'
              ? (payload as Record<string, unknown>).eventId
              : undefined,
          reason: error instanceof Error ? error.message : 'Decision failed',
        },
      };
    }
  }
}
