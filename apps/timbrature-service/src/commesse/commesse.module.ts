import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommesseController } from './commesse.controller';
import { CommesseService } from './commesse.service';
import { CommessaEntity } from './entities/commessa.entity';
import { QrCodeRevisionEntity } from './entities/qr-code-revision.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommessaEntity, QrCodeRevisionEntity])],
  controllers: [CommesseController],
  providers: [CommesseService],
  exports: [CommesseService],
})
export class CommesseModule {}
