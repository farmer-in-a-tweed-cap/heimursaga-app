import { IsNotEmpty, IsString } from 'class-validator';

export class ParamPublicIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
