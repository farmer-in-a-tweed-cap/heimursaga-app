import { IPostDetail } from '@/modules/post';
import { IUploadedFile } from '@/modules/upload';

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

export interface IUserSettingsResponse {
  context: 'profile' | 'billing';
  profile?: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    bio: string;
    picture: string;
  };
}

export interface IUserSettingsUpdateQuery {
  context: 'profile' | 'billing';
  userId: number;
  profile?: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    picture?: string;
  };
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

export interface IUserUpdatePictureQuery {
  userId: number;
  file: IUploadedFile;
}
