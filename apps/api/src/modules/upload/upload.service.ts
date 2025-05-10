import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IMediaUploadPayload,
  IMediaUploadResponse,
  MediaUploadContext,
} from '@repo/types';
import * as crypto from 'node:crypto';
import * as sharp from 'sharp';

import { UploadedFileType } from '@/common/enums';
import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { IPayloadWithSession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { UPLOAD_BUCKETS } from './upload.enum';

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

  async upload({
    payload,
    session,
  }: IPayloadWithSession<IMediaUploadPayload>): Promise<IMediaUploadResponse> {
    try {
      const {
        context,
        thumbnail = true,
        aspect = 'auto',
        file: { buffer },
      } = payload;
      const { userId } = session;

      let bucket;
      let username: string = '';
      let userRequired = false;

      // define bucket based on context
      switch (context) {
        case MediaUploadContext.UPLOAD:
          bucket = UPLOAD_BUCKETS.UPLOAD;
          break;
        case MediaUploadContext.USER:
          bucket = UPLOAD_BUCKETS.USER;
          userRequired = true;
          break;
        default:
          bucket = UPLOAD_BUCKETS.UPLOAD;
          break;
      }

      // check if the user is logged in
      if (userRequired) {
        if (!userId) throw new ServiceForbiddenException();

        await this.prisma.user
          .findFirstOrThrow({
            where: { id: userId },
            select: { id: true, username: true },
          })
          .then((user) => {
            username = user.username;
          })
          .catch(() => {
            throw new ServiceForbiddenException();
          });
      }

      // generate metadata
      const ext = 'webp';
      const mimetype = 'image/webp';
      const hash = crypto.randomBytes(24).toString('hex');
      const keys = {
        original: `${hash}.${ext}`,
        thumbnail: `${hash}_thumbnail.${ext}`,
      };
      const paths = {
        original: `${bucket}/${keys.original}`,
        thumbnail: `${bucket}/${keys.thumbnail}`,
      };

      // convert to webp and resize
      const size = {
        original: {
          width: 0,
          height: 0,
        },
        thumbnail: {
          width: 0,
          height: 0,
        },
      };

      switch (aspect) {
        case 'auto':
          size.original.width = 1200;
          size.original.height = 900;
          size.thumbnail.width = 400;
          size.thumbnail.height = 300;
          break;
        case 'square':
          size.original.width = 800;
          size.original.height = 800;
          size.thumbnail.width = 240;
          size.thumbnail.height = 240;
          break;
      }

      const buffers = {
        original: await sharp(buffer)
          .resize(size.original.width, size.original.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp()
          .toBuffer(),
        thumbnail: thumbnail
          ? await sharp(buffer)
              .resize(size.thumbnail.width, size.thumbnail.height, {
                fit: 'cover',
                position: 'center',
              })
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

      // upload the files to s3
      await Promise.all(
        uploads.map(({ key, buffer }) =>
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

      // save the upload to the database
      await this.prisma.upload
        .create({
          data: {
            file_type: 'image',
            original: paths.original,
            thumbnail: paths.thumbnail,
          },
        })
        .catch((e) => {
          this.logger.error(e);
        });

      // return original and thumbnail files
      return {
        original: paths.original,
        thumbnail: paths.thumbnail,
      };
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
