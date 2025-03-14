export interface IPostSearchPayload {
  userId?: number;
}

export interface IPostFindByIdPayload {
  publicId: string;
  userId: number;
}

export interface IPostCreatePayload {
  title: string;
  content: string;
  userId: number;
  lat?: number;
  lon?: number;
  public?: boolean;
  draft?: boolean;
  place?: string;
  date?: Date;
}

export interface IPostCreatePayloadDto extends Partial<IPostCreatePayload> {}

export interface IPostUpdatePayload {
  publicId: string;
  userId: number;
  title?: string;
  content?: string;
}

export interface IPostUpdatePayloadDto extends Partial<IPostUpdatePayload> {}

export interface IPostDeletePayload extends IPostFindByIdPayload {}

export interface IPostLikePayload extends IPostFindByIdPayload {}

export interface IPostLikeResponse {
  likesCount: number;
}

export interface IPostBookmarkPayload extends IPostFindByIdPayload {}

export interface IPostBookmarkResponse {
  bookmarksCount: number;
}
