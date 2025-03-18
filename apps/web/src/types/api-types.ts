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

export interface IPasswordResetPayload {
  email: string;
}

export interface IPasswordChangePayload {
  password: string;
  token: string;
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

export interface IPostQueryMapResponse {
  results: number;
  data: IPostDetail[];
  geojson: any;
}

export interface IPostQueryResponse {
  data: IPostDetail[];
  results: number;
}

export interface IPostDetail {
  id: string;
  title: string;
  content?: string;
  lat: number;
  lon: number;
  public?: boolean;
  draft?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  likesCount?: number;
  bookmarksCount?: number;
  place?: string;
  date?: Date;
  createdByMe?: boolean;
  author?: {
    username: string;
    name: string;
    picture: string;
  };
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

export interface IUserProfileDetail {
  username: string;
  picture: string;
  firstName: string;
  lastName: string;
  memberDate?: Date;
  followed?: boolean;
  you?: boolean;
}

export interface IUserPostsQueryResponse {
  results: number;
  data: IPostDetail[];
}

export interface ISearchQueryPayload {
  location?: ISearchQueryLocation;
  limit?: number;
  page?: number;
  userId?: number;
}

export interface ISearchQueryResponse {
  results: number;
  data: {
    id: string;
    title: string;
    date: Date;
    lat: number;
    lon: number;
  }[];
  geojson?: {
    type: 'FeatureCollection';
    features: {
      type: 'Feature';
      properties: Record<string, string | number | boolean>[];
      geometry: { type: 'Point'; coordinates: [number, number, number] };
    };
  };
}

export interface ISearchQueryLocation {
  bounds?: ISearchQueryLocationBounds;
}

export interface ISearchQueryLocationBounds {
  ne: ISearchQueryLocationBound;
  sw: ISearchQueryLocationBound;
}

export interface ISearchQueryLocationBound {
  lat: number;
  lon: number;
}

export interface IUserDetail {
  username: string;
  firstName: string;
  lastName: string;
  picture: string;
  memberDate?: Date;
  followed?: boolean;
  you?: boolean;
}

export interface IUserFollowersQueryResponse {
  results: number;
  data: IUserDetail[];
}

export interface IUserFollowingQueryResponse {
  results: number;
  data: IUserDetail[];
}

export interface IUserProfileSettings {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  picture: string;
}

export interface IUserSettingsProfileResponse {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  picture: string;
}

export interface IUserSettingsProfileUpdateQuery {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  picture?: string;
}
