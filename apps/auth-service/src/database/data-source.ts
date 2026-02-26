import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { CommessaEntity } from '../../../timbrature-service/src/commesse/entities/commessa.entity';
import { QrCodeRevisionEntity } from '../../../timbrature-service/src/commesse/entities/qr-code-revision.entity';
import { TimbraturaEntity } from '../../../timbrature-service/src/timbrature/entities/timbratura.entity';
import { LoginAttemptEntity } from '../auth/entities/login-attempt.entity';
import { RefreshSessionEntity } from '../auth/entities/refresh-session.entity';
import { UserEntity } from '../auth/entities/user.entity';

const migrationGlob = __dirname + '/migrations/*{.ts,.js}';

dotenvConfig({ path: resolve(process.cwd(), '.env.auth') });
dotenvConfig({ path: resolve(process.cwd(), '.env') });
dotenvConfig();

const sslEnabled = process.env.DATABASE_SSL === 'true';
const rejectUnauthorized =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized } : false,
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
