export interface IUploadedFile extends Fastify.Multer.File {}

export interface IUploadMediaPayload {
  file: IUploadedFile;
  userId?: number;
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

// export interface IUploadOptions {
//   options?: {
//     uploadType?: UploadType;
//     secure?: boolean;
//     thumbnail?: boolean;
//   };
//   file?: {
//     fileName?: string;
//     mimeType?: string;
//     buffer: Buffer;
//   };
//   access?: ISessionUserAccess;
// }

// export interface IUploadPayload {
//   file?: {
//     fileName?: string;
//     mimeType?: string;
//     buffer: Buffer;
//   };
// }

// export interface IUploadFilesPayload extends IUploadPayload {
//   files?: Array<{
//     fileName: string;
//     mimeType: string;
//     buffer: Buffer;
//   }>;
// }

// export interface IUploadImageOptions {
//   key: string;
//   directory: string;
//   thumbnail: boolean;
//   buffer: Buffer;
//   access?: ISessionUserAccess;
// }

// export interface IUploadImageResponse {
//   original: string;
//   thumbnail: string;
// }

// export interface IUploadDocumentOptions extends IApiQueryWithAccess {
//   buffer: Buffer;
//   mimeType: string;
// }

// export interface IUploadDocumentResponse {
//   uploadId: string;
//   original: string;
//   thumbnail: string;
// }

// export interface IUploadImageOptimizeOptions {
//   resize?: { width: number; height?: number };
//   jpeg?: boolean;
// }

// export interface IUploadImageOptimizedOutput {
//   thumbnail: Buffer;
//   original: Buffer;
// }
