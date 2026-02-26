import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('qr_code_revisions')
export class QrCodeRevisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'commessa_id' })
  commessaId: string;

  @Column({ name: 'old_code' })
  oldCode: string;

  @Column({ name: 'new_code' })
  newCode: string;

  @Column({ name: 'regenerated_by' })
  regeneratedBy: string;

  @CreateDateColumn({ name: 'regenerated_at' })
  regeneratedAt: Date;

  @Column({ nullable: true })
  reason?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ default: true })
  success: boolean;
}
