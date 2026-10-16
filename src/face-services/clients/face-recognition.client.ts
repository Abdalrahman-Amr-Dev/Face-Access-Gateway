import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { MAX_IMAGE_SIZE } from '../consts/max-image-size.const.js';

export type RecognitionStatus = 'trusted' | 'blocked' | 'unknown';

export interface FaceRecognitionResult {
  status: RecognitionStatus;
  face_id?: string | null;
  match?: {
    list: 'trusted' | 'blocked';
    id: number;
    name: string;
    score: number;
  };
  face_count?: number;
  detail?: string;
}

@Injectable()
export class FaceRecognitionClient {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config
      .getOrThrow<string>('FACE_RECOGNITION_URL')
      .replace(/\/$/, '');
  }

  async verify(
    image: Buffer,
    mimeType: string,
  ): Promise<FaceRecognitionResult> {
    const form = new FormData();
    form.append('file', image, {
      filename: 'esp32-image',
      contentType: mimeType,
    });

    try {
      const response = await firstValueFrom(
        this.http.post<FaceRecognitionResult>(`${this.baseUrl}/verify`, form, {
          headers: form.getHeaders(),
          maxContentLength: MAX_IMAGE_SIZE,
          maxBodyLength: MAX_IMAGE_SIZE + 1024,
        }),
      );
      if (!['trusted', 'blocked', 'unknown'].includes(response.data?.status)) {
        throw new Error('Invalid recognition response');
      }
      return response.data;
    } catch {
      throw new ServiceUnavailableException(
        'Face recognition service unavailable',
      );
    }
  }

  async trust(faceId: string, name: string) {
    return this.decide('/trust', { face_id: faceId, name });
  }

  async block(faceId: string, name: string, reason?: string) {
    return this.decide('/block', { face_id: faceId, name, reason });
  }

  private async decide(path: string, body: Record<string, string | undefined>) {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}${path}`, body),
      );
      return response.data;
    } catch {
      throw new ServiceUnavailableException(
        'Face recognition service unavailable',
      );
    }
  }
}
