import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { MAX_IMAGE_SIZE } from '../consts/max-image-size.const.js';

export interface FacePresenceResult {
  has_face: boolean;
  face_count?: number;
  time_ms?: number;
  backend?: string;
}

@Injectable()
export class FacePresenceClient {
  private readonly baseUrl: string;
  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config
      .getOrThrow<string>('FACE_PRESENCE_URL')
      .replace(/\/$/, '');
  }

  async detect(image: Buffer, mimeType: string): Promise<boolean> {
    const form = new FormData();
    form.append('file', image, {
      filename: 'esp32-image',
      contentType: mimeType,
    });

    try {
      const response = await firstValueFrom(
        this.http.post<FacePresenceResult>(`${this.baseUrl}/detect`, form, {
          headers: form.getHeaders(),
          maxContentLength: MAX_IMAGE_SIZE,
          maxBodyLength: MAX_IMAGE_SIZE,
        }),
      );
      return response.data.has_face;
    } catch {
      throw new ServiceUnavailableException(
        'Face presence service unavailable',
      );
    }
  }
}
