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

export interface ISessionUserQueryResponse {
  role: string;
  username: string;
  email: string;
  picture?: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}
