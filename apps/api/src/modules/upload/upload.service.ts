import { DeleteObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IMediaUploadPayload,
  IMediaUploadResponse,
  MediaUploadContext,
} from '@repo/types';
import * as crypto from 'node:crypto';
import * as sharp from 'sharp';

import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';

import { UploadedFileType } from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
} from '@/common/exceptions';
import { ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { UPLOAD_BUCKETS } from './upload.enum';

const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// Magic byte signatures for image format validation
const MAGIC_BYTES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header; WEBP at offset 8
  { mime: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box
  { mime: 'image/heif', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box
];

function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  if (!buffer || buffer.length < 12) return false;

  for (const sig of MAGIC_BYTES) {
    if (sig.mime !== claimedMime) continue;
    const offset = sig.offset ?? 0;
    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (matches) return true;
  }
  return false;
}

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
  }: ISessionQueryWithPayload<{}, IMediaUploadPayload>) {
    //Promise<IMediaUploadResponse> {
    this.logger.debug('Upload service called', {
      payload: {
        context: payload?.context,
        thumbnail: payload?.thumbnail,
        aspect: payload?.aspect,
      },
      session: { userId: session?.userId },
    });

    try {
      const { context, thumbnail = true, aspect = 'auto', file } = payload;
      const { userId } = session;

      if (!file) {
        this.logger.error('No file provided in upload payload');
        throw new ServiceBadRequestException('No file provided');
      }

      if (!file.buffer) {
        this.logger.error('File buffer is missing');
        throw new ServiceBadRequestException('Invalid file data');
      }

      // Log upload attempt with file info for debugging
      this.logger.debug(
        `Upload attempt: file received, size: ${file.buffer?.length || 0} bytes, type: ${file.mimetype}`,
      );

      // Validate file size (additional check beyond multer)
      const maxSizeBytes = 25 * 1024 * 1024; // 25MB
      const fileSize = file.buffer?.length || 0;
      if (fileSize > maxSizeBytes) {
        throw new ServiceBadRequestException(
          `File size ${Math.round(fileSize / 1024 / 1024)}MB exceeds maximum of 25MB`,
        );
      }

      // Validate file type (Content-Type header)
      if (!SUPPORTED_FORMATS.includes(file.mimetype)) {
        throw new ServiceBadRequestException(
          `Unsupported file format. Please use JPEG, PNG, WebP, HEIC, or HEIF files.`,
        );
      }

      // Validate magic bytes to prevent Content-Type spoofing
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        throw new ServiceBadRequestException(
          `File content does not match declared format. Please upload a valid image file.`,
        );
      }

      const access = !!userId;

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
        if (!access) throw new ServiceForbiddenException();

        await this.prisma.explorer
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

      // Determine optimal output format - preserve original for HD quality when possible
      let outputFormat = 'webp';
      let outputMimetype = 'image/webp';

      // For HD quality, try to preserve original format for smaller files
      const bufferSize = file.buffer?.length || 0;
      const fileSizeMB = bufferSize / (1024 * 1024);

      if (
        fileSizeMB < 8 &&
        (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png')
      ) {
        // Keep original format for smaller files to preserve maximum quality
        outputFormat = file.mimetype === 'image/jpeg' ? 'jpeg' : 'png';
        outputMimetype = file.mimetype;
      }

      const outputMetadata = {
        ext: outputFormat === 'jpeg' ? 'jpg' : outputFormat,
        mimetype: outputMimetype,
      };
      const hash = crypto.randomBytes(24).toString('hex');
      const keys = {
        original: `${hash}.${outputMetadata.ext}`,
        thumbnail: `${hash}_thumbnail.${outputMetadata.ext}`,
      };
      const paths = {
        original: `${bucket}/${keys.original}`,
        thumbnail: `${bucket}/${keys.thumbnail}`,
      };

      // Get original image metadata to preserve aspect ratio
      this.logger.debug('Starting image metadata extraction');
      const imageInfo = sharp(file.buffer);
      const imageMetadata = await imageInfo.metadata();
      const { width: originalWidth, height: originalHeight } = imageMetadata;

      if (!originalWidth || !originalHeight) {
        throw new ServiceBadRequestException(
          'Unable to read image dimensions. Please check if the file is a valid image.',
        );
      }

      this.logger.debug(
        `Image metadata: ${originalWidth}x${originalHeight}, format: ${imageMetadata.format}`,
      );

      // Calculate optimal sizes while preserving aspect ratio
      // Balanced for quality vs memory usage on 512MB dynos
      const maxOriginalWidth = 2560; // QHD width
      const maxOriginalHeight = 1920; // QHD height
      const maxThumbnailWidth = 800; // Thumbnail
      const maxThumbnailHeight = 600; // Thumbnail

      // Calculate resize dimensions preserving aspect ratio
      const originalAspectRatio = originalWidth / originalHeight;

      let originalSize, thumbnailSize;

      if (aspect === 'square') {
        // For square aspect (avatars), crop to square
        originalSize = { width: 800, height: 800 };
        thumbnailSize = { width: 300, height: 300 };
      } else {
        // Preserve original aspect ratio - only resize if image is larger than limits
        if (
          originalWidth <= maxOriginalWidth &&
          originalHeight <= maxOriginalHeight
        ) {
          // Keep original size if within limits
          originalSize = { width: originalWidth, height: originalHeight };
        } else if (originalWidth > originalHeight) {
          // Landscape - scale down
          originalSize = {
            width: Math.min(maxOriginalWidth, originalWidth),
            height: Math.min(
              maxOriginalWidth / originalAspectRatio,
              maxOriginalHeight,
            ),
          };
        } else {
          // Portrait or square - scale down
          originalSize = {
            width: Math.min(
              maxOriginalHeight * originalAspectRatio,
              maxOriginalWidth,
            ),
            height: Math.min(maxOriginalHeight, originalHeight),
          };
        }

        // Thumbnail sizing
        if (originalWidth > originalHeight) {
          // Landscape
          thumbnailSize = {
            width: Math.min(maxThumbnailWidth, originalWidth),
            height: Math.min(
              maxThumbnailWidth / originalAspectRatio,
              maxThumbnailHeight,
            ),
          };
        } else {
          // Portrait or square
          thumbnailSize = {
            width: Math.min(
              maxThumbnailHeight * originalAspectRatio,
              maxThumbnailWidth,
            ),
            height: Math.min(maxThumbnailHeight, originalHeight),
          };
        }
      }

      this.logger.debug(
        `Processing sizes - Original: ${Math.round(originalSize.width)}x${Math.round(originalSize.height)}, Thumbnail: ${Math.round(thumbnailSize.width)}x${Math.round(thumbnailSize.height)}`,
      );
      this.logger.debug(
        `Input image: ${originalWidth}x${originalHeight}, Output format: ${outputFormat}, File size: ${fileSizeMB.toFixed(2)}MB`,
      );

      let buffers;
      try {
        this.logger.debug('Starting Sharp image processing');
        const startTime = Date.now();

        // Process original with timeout handling
        let sharpInstance = sharp(file.buffer).rotate(); // Auto-rotate based on EXIF orientation data

        // Only resize if needed (image is larger than target size)
        if (
          originalWidth > originalSize.width ||
          originalHeight > originalSize.height ||
          aspect === 'square'
        ) {
          sharpInstance = sharpInstance.resize(
            Math.round(originalSize.width),
            Math.round(originalSize.height),
            {
              fit: aspect === 'square' ? 'cover' : 'inside', // Preserve aspect ratio unless square
              position: 'center',
              withoutEnlargement: true, // Don't upscale small images
            },
          );
        }

        // Apply format-specific encoding
        if (outputFormat === 'jpeg') {
          sharpInstance = sharpInstance.jpeg({
            quality: 85,
            progressive: true,
            mozjpeg: true,
          });
        } else if (outputFormat === 'png') {
          sharpInstance = sharpInstance.png({
            quality: 90,
            compressionLevel: 8,
            progressive: true,
          });
        } else {
          sharpInstance = sharpInstance.webp({
            quality: 85,
            effort: 4,
          });
        }

        // Process original first
        const timeoutMs = 30000;
        const originalBuffer = await Promise.race([
          sharpInstance.toBuffer(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Image processing timeout')), timeoutMs),
          ),
        ]);

        // Process thumbnail sequentially to avoid doubling peak memory
        let thumbnailBuffer: Buffer | null = null;
        if (thumbnail) {
          let thumbnailSharp = sharp(file.buffer)
            .rotate()
            .resize(
              Math.round(thumbnailSize.width),
              Math.round(thumbnailSize.height),
              {
                fit: aspect === 'square' ? 'cover' : 'inside',
                position: 'center',
                withoutEnlargement: true,
              },
            );

          if (outputFormat === 'jpeg') {
            thumbnailSharp = thumbnailSharp.jpeg({
              quality: 80,
              progressive: true,
              mozjpeg: true,
            });
          } else if (outputFormat === 'png') {
            thumbnailSharp = thumbnailSharp.png({
              quality: 80,
              compressionLevel: 8,
            });
          } else {
            thumbnailSharp = thumbnailSharp.webp({
              quality: 80,
              effort: 3,
            });
          }

          thumbnailBuffer = await Promise.race([
            thumbnailSharp.toBuffer(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Thumbnail processing timeout')), timeoutMs),
            ),
          ]);
        }

        buffers = { original: originalBuffer, thumbnail: thumbnailBuffer };

        const processingTime = Date.now() - startTime;
        this.logger.debug(`Sharp processing completed in ${processingTime}ms`);
      } catch (sharpError) {
        this.logger.error('Sharp processing error:', sharpError);

        if (sharpError.message === 'Image processing timeout') {
          throw new ServiceBadRequestException(
            'Image processing timeout. Please try uploading a smaller image or different format.',
          );
        }

        throw new ServiceBadRequestException(
          'Unable to process image. Please ensure the file is a valid image (JPEG, PNG, WebP, HEIC, or HEIF) and try again.',
        );
      }

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
      this.logger.debug(`Uploading ${uploads.length} files to S3`);
      const s3StartTime = Date.now();

      try {
        await Promise.all(
          uploads.map(({ key, buffer }) =>
            this.s3.send(
              new PutObjectCommand({
                Bucket: bucket,
                ContentType: outputMetadata.mimetype,
                Key: key,
                Body: buffer,
              }),
            ),
          ),
        );

        const s3UploadTime = Date.now() - s3StartTime;
        this.logger.debug(`S3 upload completed in ${s3UploadTime}ms`);
      } catch (s3Error) {
        this.logger.error('S3 upload error:', s3Error);
        throw new ServiceBadRequestException(
          'Failed to save image. Please try again.',
        );
      }

      // save the upload to the database
      const upload = await this.prisma.upload
        .create({
          data: {
            public_id: generator.secureId(),
            file_type: 'image',
            original: paths.original,
            thumbnail: paths.thumbnail,
            explorer_id: userId,
          },
          select: { public_id: true },
        })
        .catch(() => {
          throw new ServiceBadRequestException('upload failed');
        });

      // return original and thumbnail files
      const result = {
        uploadId: upload.public_id,
        original: getStaticMediaUrl(paths.original),
        thumbnail: getStaticMediaUrl(paths.thumbnail),
      };

      this.logger.debug(
        `Upload complete - Original URL: ${result.original}, Thumbnail URL: ${result.thumbnail}`,
      );
      return result;
    } catch (e) {
      this.logger.error('Upload service error:', e);

      if (e instanceof ServiceBadRequestException) {
        throw e; // Re-throw our custom errors with user-friendly messages
      }

      if (e.status) {
        throw e;
      }

      // Generic fallback for unexpected errors
      throw new ServiceBadRequestException(
        'Upload failed. Please try again with a different image.',
      );
    }
  }

  async uploadAudio({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, { file: any }>) {
    try {
      const { file } = payload;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();
      if (!file) throw new ServiceBadRequestException('No file provided');
      if (!file.buffer)
        throw new ServiceBadRequestException('Invalid file data');

      const SUPPORTED_AUDIO_PREFIXES = [
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
      ];
      const baseMime = (file.mimetype || '').split(';')[0].trim();
      if (!SUPPORTED_AUDIO_PREFIXES.some((p) => baseMime === p)) {
        this.logger.error(`Unsupported audio mimetype: ${file.mimetype}`);
        throw new ServiceBadRequestException(
          'Unsupported audio format. Please use WebM, MP4, MPEG, or OGG.',
        );
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.buffer.length > maxSize) {
        throw new ServiceBadRequestException(
          `Audio file size ${Math.round(file.buffer.length / 1024 / 1024)}MB exceeds maximum of 5MB`,
        );
      }

      const ext =
        baseMime === 'audio/webm'
          ? 'webm'
          : baseMime === 'audio/mp4'
            ? 'm4a'
            : baseMime === 'audio/mpeg'
              ? 'mp3'
              : 'ogg';
      const hash = crypto.randomBytes(24).toString('hex');
      const key = `voice-notes/${hash}.${ext}`;
      const bucket = UPLOAD_BUCKETS.AUDIO;
      const path = `${bucket}/${key}`;

      this.logger.debug(`Uploading audio: ${key}, mime=${baseMime}, size=${file.buffer.length}`);

      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          ContentType: baseMime,
          Key: key,
          Body: file.buffer,
        }),
      );

      return { audioUrl: getStaticMediaUrl(path) };
    } catch (e) {
      this.logger.error(`Audio upload error: ${e?.message || JSON.stringify(e)} | stack: ${e?.stack || 'none'}`);
      if (
        e instanceof ServiceBadRequestException ||
        e instanceof ServiceForbiddenException
      )
        throw e;
      if (e.status) throw e;
      throw new ServiceBadRequestException(
        'Audio upload failed. Please try again.',
      );
    }
  }

  getFileType(mimeType: string): UploadedFileType {
    if (!mimeType) return null;
    if (mimeType.includes('image/')) return UploadedFileType.IMAGE;
    if (mimeType.includes('video/')) return UploadedFileType.VIDEO;
    if (mimeType.includes('application/pdf')) return UploadedFileType.DOCUMENT;

    return null;
  }

  /**
   * Delete an object from S3 by its stored path (e.g. "upload/abc123.jpg").
   * The path format is "{bucket}/{key}" as stored in the database.
   */
  async deleteFromS3(path: string): Promise<void> {
    if (!path) return;

    const separatorIndex = path.indexOf('/');
    if (separatorIndex === -1) {
      this.logger.warn(`Invalid S3 path format (no bucket prefix): ${path}`);
      return;
    }

    const bucket = path.substring(0, separatorIndex);
    const key = path.substring(separatorIndex + 1);

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete S3 object: ${path}`, error);
    }
  }
}
