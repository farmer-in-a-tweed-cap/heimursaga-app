import { Injectable } from '@nestjs/common';

import { Logger } from '@/modules/logger';

export interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly secretKey: string;
  private readonly minScore: number = 0.5; // Minimum score to consider human

  constructor(private logger: Logger) {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';

    if (!this.secretKey) {
      this.logger.warn(
        'RECAPTCHA_SECRET_KEY not found in environment variables',
      );
    }
  }

  async verifyToken(token: string, remoteip?: string): Promise<boolean> {
    try {
      if (!this.secretKey) {
        this.logger.warn(
          'reCAPTCHA verification skipped - no secret key configured',
        );
        return true; // Allow in development if not configured
      }

      if (!token) {
        return false;
      }

      const response = await this.makeVerificationRequest(token, remoteip);

      if (!response.success) {
        this.logger.warn('reCAPTCHA verification failed', {
          errors: response['error-codes'],
        });
        return false;
      }

      // For reCAPTCHA v3, check the score
      if (response.score !== undefined) {
        const isHuman = response.score >= this.minScore;

        this.logger.log('reCAPTCHA verification completed', {
          score: response.score,
          action: response.action,
          isHuman,
        });

        return isHuman;
      }

      // For reCAPTCHA v2, success is enough
      return true;
    } catch (error) {
      this.logger.error('reCAPTCHA verification error', error);
      return false;
    }
  }

  private async makeVerificationRequest(
    token: string,
    remoteip?: string,
  ): Promise<RecaptchaVerifyResponse> {
    const params = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });

    if (remoteip) {
      params.append('remoteip', remoteip);
    }

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );

    if (!response.ok) {
      throw new Error(`reCAPTCHA API request failed: ${response.status}`);
    }

    return response.json() as Promise<RecaptchaVerifyResponse>;
  }

  isConfigured(): boolean {
    return !!this.secretKey;
  }
}
