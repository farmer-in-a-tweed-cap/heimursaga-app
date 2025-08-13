import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000, { message: 'Message content must not exceed 5000 characters' })
  content: string;

  @IsNotEmpty()
  @IsString()
  recipientUsername: string;
}

export class GetMessagesDto {
  @IsString()
  recipientUsername: string;
}

export class MarkMessageReadDto {
  @IsNotEmpty()
  @IsString()
  messageId: string;
}