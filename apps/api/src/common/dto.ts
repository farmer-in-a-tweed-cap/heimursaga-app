import { IsNotEmpty, IsString } from 'class-validator';

export class ParamPublicIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ParamSlugDto {
  @IsString()
  @IsNotEmpty()
  slug: string;
}

export class ParamUsernameDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}
