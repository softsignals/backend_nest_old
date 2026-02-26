import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JsonLoggerService } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimbraturaEntity } from './entities/timbratura.entity';
import { TimbratureController } from './timbrature.controller';
import { TimbratureProcessor } from './timbrature.processor';
import { TimbratureService } from './timbrature.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimbraturaEntity]),
    BullModule.registerQueue({
      name: 'timbrature',
  }),
  ],
  controllers: [TimbratureController],
  providers: [JsonLoggerService, TimbratureService, TimbratureProcessor],
})
export class TimbratureModule {}
