import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import {
  ILoginQueryPayloadDto,
  IPasswordChangePayload,
  IPasswordResetPayload,
  ISignupQueryPayloadDto,
} from './auth.interface';

export class LoginPayloadDto implements ILoginQueryPayloadDto {
  @ApiProperty({ required: false })
  @IsEmail()
  @IsNotEmpty()
  @IsOptional()
  email: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignupPayloadDto implements ISignupQueryPayloadDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  username: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class PasswordResetDto implements IPasswordResetPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class PasswordChangeDto implements IPasswordChangePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}
