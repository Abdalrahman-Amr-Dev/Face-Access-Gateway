import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

export interface FacePresenceResult {
  has_face: boolean;
  face_count?: number;
  time_ms?: number;
  backend?: string;
}

@Injectable()
export class FacePresenceClient {
  private readonly baseUrl: string;

  private readonly maxContentLength = 5 * 1024 * 1024; // 5 MB
  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = (
      config.getOrThrow<string>('FACE_PRESENCE_URL')
    ).replace(/\/$/, '');
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
          maxContentLength: this.maxContentLength,
          maxBodyLength: this.maxContentLength,
        }),
      );
      return response.data.has_face;
    } catch {
      throw new ServiceUnavailableException('Face presence service unavailable');
    }
  }
}
