import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { SanitizeText } from '@/lib/sanitizer';

export class VoiceNoteCreateDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  audioUrl: string;

  @ApiProperty({ required: true })
  @IsNumber()
  @Min(1)
  @Max(60)
  durationSeconds: number;

  @ApiProperty({ required: false })
  @SanitizeText()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  caption?: string;
}

export class VoiceNoteExpeditionParamDto {
  @IsString()
  @IsNotEmpty()
  expedition_id: string;
}

export class VoiceNoteIdParamDto {
  @IsString()
  @IsNotEmpty()
  expedition_id: string;

  @IsString()
  @IsNotEmpty()
  note_id: string;
}
