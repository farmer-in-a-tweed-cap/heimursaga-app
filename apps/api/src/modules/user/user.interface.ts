import { IPostDetail } from '@/modules/post';

export interface IUserProfileDetail {
  username: string;
  picture: string;
  firstName: string;
  lastName: string;
  memberDate?: Date;
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
}

export interface IUserFollowersQueryResponse {
  results: number;
  data: IUserDetail[];
}

export interface IUserFollowingQueryResponse {
  results: number;
  data: IUserDetail[];
}
