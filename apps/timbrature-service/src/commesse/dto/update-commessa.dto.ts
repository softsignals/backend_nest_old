import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCommessaDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  descrizione?: string;

  @IsBoolean()
  @IsOptional()
  attiva?: boolean;
}
