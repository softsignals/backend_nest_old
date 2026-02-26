import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommesseService } from './commesse.service';
import { CreateCommessaDto } from './dto/create-commessa.dto';
import { RegenerateQrDto } from './dto/regenerate-qr.dto';
import { UpdateCommessaDto } from './dto/update-commessa.dto';

@Controller('commesse')
export class CommesseController {
  constructor(private readonly commesseService: CommesseService) {}

  @Post()
  create(@Body() dto: CreateCommessaDto) {
    return this.commesseService.create(dto);
  }

  @Get()
  list() {
    return this.commesseService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.commesseService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommessaDto) {
    return this.commesseService.update(id, dto);
  }

  @Post(':id/qr/regenerate')
  regenerateQr(
    @Param('id') id: string,
    @Body() dto: RegenerateQrDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    return this.commesseService.regenerateQr(id, dto, forwardedFor);
  }

  @Get(':id/qr/history')
  history(@Param('id') id: string) {
    return this.commesseService.history(id);
  }
}
