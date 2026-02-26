import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrigineEnum, TipoTimbraturaEnum } from '../entities/timbratura.entity';

export class CreateTimbraturaDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  commessaId: string;

  @IsEnum(TipoTimbraturaEnum)
  tipo: TipoTimbraturaEnum;

  @IsDateString()
  deviceTimestamp: string;

  @IsEnum(OrigineEnum)
  @IsOptional()
  origine?: OrigineEnum;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
