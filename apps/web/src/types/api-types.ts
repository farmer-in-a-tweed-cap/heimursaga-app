export interface ILoginQueryPayload {
  email: string;
  password: string;
}

export interface ISignupQueryPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ISessionUser {
  role: string;
  username: string;
  email: string;
  picture?: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}

export interface ISessionUserQueryResponse extends ISessionUser {}

export interface IPostFindByIdPayload {
  postId: string;
}

export interface IPostDetail {
  id: string;
  title: string;
  content: string;
  userId: number;
  lat: number;
  lon: number;
  public: boolean;
  draft: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  likesCount?: boolean;
  bookmarksCount?: boolean;
  place?: string;
  date?: Date;
  createdByMe?: boolean;
}

export interface IPostCreatePayload {
  title: string;
  content: string;
  lat?: number;
  lon?: number;
  public?: boolean;
  draft?: boolean;
  place?: string;
  date?: Date;
}

export interface IPostCreateResponse {
  id: string;
}

export interface IPostUpdatePayload {
  postId: string;
  data: {
    title?: string;
    content?: string;
    lat?: number;
    lon?: number;
    public?: boolean;
    draft?: boolean;
    place?: string;
    date?: Date;
  };
}
