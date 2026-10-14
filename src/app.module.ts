import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Esp32Gateway } from './esp32/esp32.gateway.js';
import { Esp32ProtocolController } from './esp32/esp32-protocol.controller.js';

@Module({
  imports: [],
  controllers: [AppController, Esp32ProtocolController],
  providers: [AppService, Esp32Gateway],
})
export class AppModule {}
