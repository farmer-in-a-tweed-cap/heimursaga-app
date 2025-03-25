import { UploadContext } from './upload.enum';

export interface IUploadedFile extends Fastify.Multer.File {}

export interface IUploadMediaPayload {
  file: IUploadedFile;
  context: UploadContext;
  user?: {
    id?: number;
    username?: string;
  };
  thumbnail?: boolean;
}

export interface IUploadMediaQuery {
  thumbnail?: boolean;
}

export interface IUploadMediaQueryDto extends IUploadMediaQuery {}

export interface IUploadMediaResponse {
  thumbnail: string;
  original: string;
}
