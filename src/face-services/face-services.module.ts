import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FacePresenceClient } from './face-presence.client.js';

@Module({
  imports: [HttpModule],
  providers: [FacePresenceClient],
  exports: [FacePresenceClient],
})
export class FaceServicesModule {}
