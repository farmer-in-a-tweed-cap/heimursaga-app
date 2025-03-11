export interface IPostFindByIdPayload {
  id: number;
  userId: number;
}

export interface IPostCreatePayload {
  title: string;
  content: string;
  userId: number;
}

export interface IPostCreatePayloadDto extends Partial<IPostCreatePayload> {}

export interface IPostUpdatePayload {
  id: number;
  userId: number;
  title?: string;
  content?: string;
}

export interface IPostUpdatePayloadDto extends Partial<IPostUpdatePayload> {}

export interface IPostDeletePayload extends IPostFindByIdPayload {}

export interface IPostLikePayload extends IPostFindByIdPayload {}

export interface IPostLikeResponse {
  likes: number;
}

export interface IPostBookmarkPayload extends IPostFindByIdPayload {}
