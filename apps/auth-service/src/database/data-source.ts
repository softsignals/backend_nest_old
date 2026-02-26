import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CommessaEntity } from '../../../timbrature-service/src/commesse/entities/commessa.entity';
import { QrCodeRevisionEntity } from '../../../timbrature-service/src/commesse/entities/qr-code-revision.entity';
import { TimbraturaEntity } from '../../../timbrature-service/src/timbrature/entities/timbratura.entity';
import { LoginAttemptEntity } from '../auth/entities/login-attempt.entity';
import { RefreshSessionEntity } from '../auth/entities/refresh-session.entity';
import { UserEntity } from '../auth/entities/user.entity';

const migrationGlob = __dirname + '/migrations/*{.ts,.js}';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity,
    RefreshSessionEntity,
    LoginAttemptEntity,
    TimbraturaEntity,
    CommessaEntity,
    QrCodeRevisionEntity,
  ],
  migrations: [migrationGlob],
  synchronize: false,
});

export default AppDataSource;
