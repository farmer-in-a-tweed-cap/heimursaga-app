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
    const matches = sig.bytes.every(
      (byte, i) => buffer[offset + i] === byte,
    );
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
      const maxSizeBytes = 15 * 1024 * 1024; // 15MB
      const fileSize = file.buffer?.length || 0;
      if (fileSize > maxSizeBytes) {
        throw new ServiceBadRequestException(
          `File size ${Math.round(fileSize / 1024 / 1024)}MB exceeds maximum of 15MB`,
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
      // HD quality limits - much higher resolution
      const maxOriginalWidth = 4096; // 4K width
      const maxOriginalHeight = 3072; // 4K height
      const maxThumbnailWidth = 1200; // HD thumbnail
      const maxThumbnailHeight = 900; // HD thumbnail

      // Calculate resize dimensions preserving aspect ratio
      const originalAspectRatio = originalWidth / originalHeight;

      let originalSize, thumbnailSize;

      if (aspect === 'square') {
        // For square aspect, crop to square but use higher resolution
        originalSize = { width: 1200, height: 1200 };
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

        let originalPromise;
        if (outputFormat === 'jpeg') {
          originalPromise = sharpInstance
            .jpeg({
              quality: 98, // High quality JPEG
              progressive: true,
              mozjpeg: true, // Better compression
            })
            .toBuffer();
        } else if (outputFormat === 'png') {
          originalPromise = sharpInstance
            .png({
              quality: 100, // Lossless PNG
              compressionLevel: 6,
              progressive: true,
            })
            .toBuffer();
        } else {
          // WebP fallback
          originalPromise = sharpInstance
            .webp({
              quality: 100, // Lossless WebP
              lossless: true,
              effort: 6,
            })
            .toBuffer();
        }

        // Process thumbnail
        let thumbnailPromise;
        if (thumbnail) {
          const thumbnailSharp = sharp(file.buffer)
            .rotate() // Auto-rotate based on EXIF orientation data
            .resize(
              Math.round(thumbnailSize.width),
              Math.round(thumbnailSize.height),
              {
                fit: aspect === 'square' ? 'cover' : 'inside', // Preserve aspect ratio unless square
                position: 'center',
                withoutEnlargement: true,
              },
            );

          if (outputFormat === 'jpeg') {
            thumbnailPromise = thumbnailSharp
              .jpeg({
                quality: 95, // High quality thumbnail
                progressive: true,
                mozjpeg: true,
              })
              .toBuffer();
          } else if (outputFormat === 'png') {
            thumbnailPromise = thumbnailSharp
              .png({
                quality: 100,
                compressionLevel: 6,
              })
              .toBuffer();
          } else {
            thumbnailPromise = thumbnailSharp
              .webp({
                quality: 95, // High quality WebP thumbnail
                effort: 4,
              })
              .toBuffer();
          }
        } else {
          thumbnailPromise = Promise.resolve(null);
        }

        // Process both images in parallel with timeout
        const timeoutMs = 30000; // 30 second timeout
        buffers = await Promise.race([
          Promise.all([originalPromise, thumbnailPromise]).then(
            ([original, thumbnail]) => ({
              original,
              thumbnail,
            }),
          ),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Image processing timeout')),
              timeoutMs,
            ),
          ),
        ]);

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

  getFileType(mimeType: string): UploadedFileType {
    if (!mimeType) return null;
    if (mimeType.includes('image/')) return UploadedFileType.IMAGE;
    if (mimeType.includes('video/')) return UploadedFileType.VIDEO;
    if (mimeType.includes('application/pdf')) return UploadedFileType.DOCUMENT;

    return null;
  }
}
