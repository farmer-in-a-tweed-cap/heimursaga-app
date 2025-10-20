import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { SanitizeText } from '@/lib/sanitizer';

export class CommentCreateDto {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MaxLength(5000, { message: 'Comment must be less than 5,000 characters' })
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string; // Public ID of parent comment for replies
}

export class CommentUpdateDto {
  @ApiProperty({ required: true })
  @SanitizeText()
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MaxLength(5000, { message: 'Comment must be less than 5,000 characters' })
  content: string;
}

export class CommentQueryDto {
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  cursor?: string;
}
