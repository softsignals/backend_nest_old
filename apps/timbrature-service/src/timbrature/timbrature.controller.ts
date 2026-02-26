import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTimbraturaDto } from './dto/create-timbratura.dto';
import { ListTimbratureDto } from './dto/list-timbrature.dto';
import { TimbratureService } from './timbrature.service';

@Controller('timbrature')
export class TimbratureController {
  constructor(private readonly timbratureService: TimbratureService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @Body() dto: CreateTimbraturaDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.timbratureService.enqueueCreate(dto, idempotencyKey);
  }

  @Get()
  list(@Query() dto: ListTimbratureDto) {
    return this.timbratureService.list(dto);
  }

  @Get('jobs/:jobId')
  jobStatus(@Param('jobId') jobId: string) {
    return this.timbratureService.getJobStatus(jobId);
  }
}
