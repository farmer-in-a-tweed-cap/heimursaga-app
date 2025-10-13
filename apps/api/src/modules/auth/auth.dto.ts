import { ApiProperty } from '@nestjs/swagger';
import {
  ILoginPayload,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  ISignupPayload,
} from '@repo/types';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto implements ILoginPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignupDto implements ISignupPayload {
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

  @ApiProperty({
    required: false,
    description: 'reCAPTCHA token for bot protection',
  })
  @IsString()
  @IsOptional()
  recaptchaToken?: string;

  // @ApiProperty({ required: true })
  // @IsString()
  // @IsNotEmpty()
  // name: string;
}

export class PasswordResetDto implements IPasswordResetPayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class PasswordUpdateDto implements IPasswordUpdatePayload {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;
}
