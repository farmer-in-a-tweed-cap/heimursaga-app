import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { SanitizeText } from '@/lib/sanitizer';

import { ToNumber } from '@/common/decorators';

export class ExpeditionNoteCreateDto {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text: string;
}

export class ExpeditionNoteReplyCreateDto {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text: string;
}

export class ExpeditionNoteParamDto {
  @IsString()
  @IsNotEmpty()
  expedition_id: string;
}

export class ExpeditionNoteUpdateDto {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text: string;
}

export class ExpeditionNoteIdParamDto {
  @IsString()
  @IsNotEmpty()
  expedition_id: string;

  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  note_id: number;
}

export class ExpeditionNoteReplyIdParamDto {
  @IsString()
  @IsNotEmpty()
  expedition_id: string;

  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  note_id: number;

  @IsNumber()
  @ToNumber()
  @IsNotEmpty()
  reply_id: number;
}
