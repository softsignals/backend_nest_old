import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegenerateQrDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  regeneratedBy?: string;
}
