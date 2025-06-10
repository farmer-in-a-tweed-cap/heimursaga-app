import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ToNumber } from './decorators';

export class ParamIdDto {
  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  id: number;
}

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
