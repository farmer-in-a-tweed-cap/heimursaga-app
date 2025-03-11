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

export interface IPostDeletePayload {
  id: number;
  userId: number;
}
