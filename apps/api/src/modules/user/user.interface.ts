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
