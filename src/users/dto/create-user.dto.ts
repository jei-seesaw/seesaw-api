import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ maxLength: 120, minLength: 1 })
  @IsString()
  @Length(1, 120)
  name!: string;
}
