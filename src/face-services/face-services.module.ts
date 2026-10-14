import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FacePresenceClient } from './clients/face-presence.client.js';
import { FaceRecognitionClient } from './clients/face-recognition.client.js';

@Module({
  imports: [HttpModule],
  providers: [FacePresenceClient, FaceRecognitionClient],
  exports: [FacePresenceClient, FaceRecognitionClient],
})
export class FaceServicesModule {}
