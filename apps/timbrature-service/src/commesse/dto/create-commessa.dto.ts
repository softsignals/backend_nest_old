import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommessaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  descrizione?: string;

  @IsBoolean()
  @IsOptional()
  attiva?: boolean;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
