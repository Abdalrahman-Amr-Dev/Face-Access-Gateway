import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('frontend')
@Controller('frontend')
export class FrontendProtocolController {
  @Get('protocol')
  @ApiOperation({ summary: 'Get the frontend WebSocket protocol' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', example: '/ws/frontend' },
        incomingEvent: { type: 'string', example: 'decision' },
        outgoingEvents: { type: 'array', items: { type: 'string' } },
        decisionFields: { type: 'array', items: { type: 'string' } },
        actionDescriptions: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        pendingLifetimeSeconds: { type: 'number', example: 300 },
      },
    },
  })
  getProtocol() {
    return {
      path: '/ws/frontend',
      incomingEvent: 'decision',
      outgoingEvents: [
        'face.unknown',
        'decision.applied',
        'decision.accepted',
        'decision.rejected',
      ],
      decisionFields: [
        'eventId',
        'action: allow | prevent | trust | block',
        'name (required for trust and block; optional for allow and prevent)',
        'reason (optional)',
      ],
      actionDescriptions: {
        allow: 'Allow this event once; no recognition enrollment',
        prevent: 'Deny this event once; no recognition enrollment',
        trust: 'Enroll the face using POST /trust',
        block: 'Enroll the face using POST /block',
      },
      pendingLifetimeSeconds: 300,
    };
  }
}
