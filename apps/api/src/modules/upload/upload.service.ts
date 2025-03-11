import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as sharp from 'sharp';

import { UploadedFileType } from '@/common/enums';
import { ServiceException } from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IUploadMediaPayload, IUploadMediaResponse } from './upload.interface';

@Injectable()
export class UploadService {
  private s3: S3;

  constructor(
    private config: ConfigService,
    private logger: Logger,
    private prisma: PrismaService,
  ) {
    const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY } =
      process.env;

    this.s3 = new S3({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }

  async upload(payload: IUploadMediaPayload): Promise<IUploadMediaResponse> {
    try {
      const { S3_BUCKET } = process.env;

      const {
        thumbnail,
        file: { buffer, mimetype },
      } = payload;

      const bucket = S3_BUCKET;
      const ext = 'webp';

      const hash = crypto.randomBytes(24).toString('hex');
      const keys = {
        original: `${hash}.${ext}`,
        thumbnail: `${hash}_thumbnail.${ext}`,
      };
      const paths = {
        original: `${bucket}/${keys.original}`,
        thumbnail: `${bucket}/${keys.thumbnail}`,
      };

      console.log({
        hash,
        keys,
        paths,
        bucket,
        mimetype,
      });

      // convert to webp and resize
      const buffers = {
        original: await sharp(buffer)
          .resize(1200, 900, { fit: 'cover', position: 'center' })
          .webp()
          .toBuffer(),
        thumbnail: thumbnail
          ? await sharp(buffer)
              .resize(400, 300, { fit: 'cover', position: 'center' })
              .webp({ quality: 75 })
              .toBuffer()
          : null,
      };

      const uploads = [
        {
          key: keys.original,
          buffer: buffers.original,
        },
        thumbnail
          ? {
              key: keys.thumbnail,
              buffer: buffers.thumbnail,
            }
          : undefined,
      ].filter((upload) => upload);

      console.log({ uploads, paths, keys });

      // upload the files
      const s = await Promise.all(
        uploads.map(({ key }) =>
          this.s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              ContentType: mimetype,
              Key: key,
              Body: buffer,
            }),
          ),
        ),
      );

      console.log({ s });

      const response: IUploadMediaResponse = {
        original: paths.original,
        thumbnail: paths.thumbnail,
      };

      return response;
    } catch (e) {
      this.logger.error(e);

      if (e.status) throw new ServiceException(e.message, e.status);
    }
  }

  getFileType(mimeType: string): UploadedFileType {
    if (!mimeType) return null;
    if (mimeType.includes('image/')) return UploadedFileType.IMAGE;
    if (mimeType.includes('video/')) return UploadedFileType.VIDEO;
    if (mimeType.includes('application/pdf')) return UploadedFileType.DOCUMENT;

    return null;
  }
}
