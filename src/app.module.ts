import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Esp32Gateway } from './esp32/esp32.gateway.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, Esp32Gateway],
})
export class AppModule {}
