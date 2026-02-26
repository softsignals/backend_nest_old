import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshSessionEntity } from './refresh-session.entity';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DIPENDENTE = 'DIPENDENTE',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'codice_dipendente', unique: true })
  codiceDipendente: string;

  @Column()
  nome: string;

  @Column()
  cognome: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({
    name: 'ruolo',
    type: 'enum',
    enum: RoleEnum,
    default: RoleEnum.DIPENDENTE,
  })
  ruolo: RoleEnum;

  @Column({ nullable: true })
  reparto?: string;

  @Column({ nullable: true })
  qualifica?: string;

  @Column({ name: 'attivo', default: true })
  attivo: boolean;

  @Column({ name: 'data_assunzione', type: 'date' })
  dataAssunzione: string;

  @Column({ name: 'token_version', type: 'int', default: 1 })
  tokenVersion: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  note?: string;

  @OneToMany(() => RefreshSessionEntity, (session) => session.user)
  sessions: RefreshSessionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
