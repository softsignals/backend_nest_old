import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LoginAttemptScope {
  EMAIL = 'EMAIL',
  IP = 'IP',
}

@Entity('login_attempts')
@Index(['scope', 'identifier'], { unique: true })
export class LoginAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  scope: LoginAttemptScope;

  @Column({ type: 'varchar' })
  identifier: string;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_failed_at', type: 'timestamptz', nullable: true })
  lastFailedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
