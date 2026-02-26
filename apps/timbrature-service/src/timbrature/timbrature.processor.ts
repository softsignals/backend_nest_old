import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JsonLoggerService } from '@app/common';
import { Job } from 'bullmq';
import { CreateTimbraturaDto } from './dto/create-timbratura.dto';
import { TimbratureService } from './timbrature.service';

@Processor('timbrature')
export class TimbratureProcessor extends WorkerHost {
  constructor(
    private readonly timbratureService: TimbratureService,
    private readonly logger: JsonLoggerService,
  ) {
    super();
  }

  async process(
    job: Job<CreateTimbraturaDto & { idempotencyKey?: string }>,
  ): Promise<unknown> {
    if (job.name !== 'create-timbratura') {
      this.logger.warn(
        {
          event: 'unhandled_job',
          queue: 'timbrature',
          jobName: job.name,
        },
        TimbratureProcessor.name,
      );
      return null;
    }

    const timbratura = await this.timbratureService.persistTimbratura(job.data);
    return {
      timbraturaId: timbratura.id,
      deviceTimestamp: timbratura.deviceTimestamp,
    };
  }
}
