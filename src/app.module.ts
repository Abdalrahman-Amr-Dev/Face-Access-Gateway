import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Esp32Gateway } from './esp32/esp32.gateway.js';
import { Esp32ProtocolController } from './esp32/esp32-protocol.controller.js';
import { FaceServicesModule } from './face-services/face-services.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), FaceServicesModule],
  controllers: [AppController, Esp32ProtocolController],
  providers: [AppService, Esp32Gateway],
})
export class AppModule {}
