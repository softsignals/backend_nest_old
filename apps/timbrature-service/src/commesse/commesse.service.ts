import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CreateCommessaDto } from './dto/create-commessa.dto';
import { RegenerateQrDto } from './dto/regenerate-qr.dto';
import { UpdateCommessaDto } from './dto/update-commessa.dto';
import { CommessaEntity } from './entities/commessa.entity';
import { QrCodeRevisionEntity } from './entities/qr-code-revision.entity';

@Injectable()
export class CommesseService {
  constructor(
    @InjectRepository(CommessaEntity)
    private readonly commesseRepository: Repository<CommessaEntity>,
    @InjectRepository(QrCodeRevisionEntity)
    private readonly qrRevisionsRepository: Repository<QrCodeRevisionEntity>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCommessaDto) {
    const commessa = this.commesseRepository.create({
      nome: dto.nome,
      descrizione: dto.descrizione,
      attiva: dto.attiva ?? true,
      createdBy: dto.createdBy,
      codiceQrAttivo: randomUUID(),
    });
    return this.commesseRepository.save(commessa);
  }

  list() {
    return this.commesseRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string) {
    const commessa = await this.commesseRepository.findOne({ where: { id } });
    if (!commessa) throw new NotFoundException('Commessa not found');
    return commessa;
  }

  async update(id: string, dto: UpdateCommessaDto) {
    const commessa = await this.getById(id);
    this.commesseRepository.merge(commessa, dto);
    return this.commesseRepository.save(commessa);
  }

  async regenerateQr(id: string, dto: RegenerateQrDto, ipAddress?: string) {
    const expectedPassword = this.configService.get<string>(
      'COMMESSE_QR_REGEN_PASSWORD',
    );
    if (expectedPassword && dto.password !== expectedPassword) {
      throw new ForbiddenException('Invalid QR regeneration password');
    }

    const commessa = await this.getById(id);
    const oldCode = commessa.codiceQrAttivo;
    const newCode = randomUUID();

    commessa.codiceQrAttivo = newCode;
    await this.commesseRepository.save(commessa);

    const revision = this.qrRevisionsRepository.create({
      commessaId: commessa.id,
      oldCode,
      newCode,
      regeneratedBy: dto.regeneratedBy ?? 'SYSTEM',
      reason: dto.reason,
      ipAddress,
      success: true,
    });
    await this.qrRevisionsRepository.save(revision);

    return {
      commessaId: commessa.id,
      oldCode,
      newCode,
      regeneratedBy: revision.regeneratedBy,
      regeneratedAt: revision.regeneratedAt,
      success: true,
    };
  }

  history(id: string) {
    return this.qrRevisionsRepository.find({
      where: { commessaId: id },
      order: { regeneratedAt: 'DESC' },
    });
  }
}
