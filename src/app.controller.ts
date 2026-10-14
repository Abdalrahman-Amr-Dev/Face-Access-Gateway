import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@Controller()
@ApiTags('gateway')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Gateway status' })
  @ApiOkResponse({ description: 'Returns a basic gateway status message.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
