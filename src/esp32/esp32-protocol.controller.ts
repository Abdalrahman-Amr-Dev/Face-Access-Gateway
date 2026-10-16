import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

class Esp32ProtocolResponse {
  @ApiProperty({ example: 'ws://localhost:3000/ws/esp32' })
  websocketUrl!: string;

  @ApiProperty({ example: 'image' })
  event!: string;

  @ApiProperty({ example: 'imageBase64' })
  imageField!: string;

  @ApiProperty({ example: ['image/jpeg', 'image/png'] })
  acceptedMimeTypes!: string[];

  @ApiProperty({ example: '5 MB' })
  maximumImageSize!: string;

  @ApiProperty({ example: 'image.result' })
  acceptedResponseEvent!: string;

  @ApiProperty({ example: 'image.rejected' })
  rejectedResponseEvent!: string;
}

@Controller('esp32')
@ApiTags('esp32')
export class Esp32ProtocolController {
  @Get('protocol')
  @ApiOperation({ summary: 'Get the ESP32 WebSocket protocol' })
  @ApiOkResponse({
    description: 'Connection and message details for the ESP32 gateway.',
    type: Esp32ProtocolResponse,
  })
  getProtocol(): Esp32ProtocolResponse {
    return {
      websocketUrl: 'ws://localhost:3000/ws/esp32',
      event: 'image',
      imageField: 'imageBase64',
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maximumImageSize: '5 MB',
      acceptedResponseEvent: 'image.result',
      rejectedResponseEvent: 'image.rejected',
    };
  }
}
