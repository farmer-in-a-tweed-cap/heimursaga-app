import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { IPostCreatePayloadDto, IPostUpdatePayloadDto } from './post.interface';

export class PostCreatePayloadDto implements IPostCreatePayloadDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class PostUpdatePayloadDto implements IPostUpdatePayloadDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  content: string;
}
