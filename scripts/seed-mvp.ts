import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import AppDataSource from '../apps/auth-service/src/database/data-source';
import { RoleEnum, UserEntity } from '../apps/auth-service/src/auth/entities/user.entity';
import { CommessaEntity } from '../apps/timbrature-service/src/commesse/entities/commessa.entity';

type SeedUser = {
  email: string;
  password: string;
  codiceDipendente: string;
  nome: string;
  cognome: string;
  ruolo: RoleEnum;
};

const usersToSeed: SeedUser[] = [
  {
    email: process.env.AUTH_ADMIN_EMAIL || 'admin@timbrio.com',
    password: process.env.AUTH_ADMIN_PASSWORD || 'ChangeMe123!',
    codiceDipendente: process.env.AUTH_ADMIN_CODICE_DIPENDENTE || 'ADMIN-0001',
    nome: process.env.AUTH_ADMIN_NOME || 'Admin',
    cognome: process.env.AUTH_ADMIN_COGNOME || 'User',
    ruolo: RoleEnum.ADMIN,
  },
  {
    email: 'manager@timbrio.com',
    password: 'Manager123!',
    codiceDipendente: 'MGR-0001',
    nome: 'Mario',
    cognome: 'Manager',
    ruolo: RoleEnum.MANAGER,
  },
  {
    email: 'dipendente@timbrio.com',
    password: 'Dipendente123!',
    codiceDipendente: 'DIP-0001',
    nome: 'Diego',
    cognome: 'Dipendente',
    ruolo: RoleEnum.DIPENDENTE,
  },
];

const commesseToSeed = [
  {
    nome: 'Commessa Nord',
    descrizione: 'Commessa pilota area Nord',
  },
  {
    nome: 'Commessa Sud',
    descrizione: 'Commessa pilota area Sud',
  },
];

async function upsertUsers(): Promise<UserEntity[]> {
  const userRepository = AppDataSource.getRepository(UserEntity);
  const seededUsers: UserEntity[] = [];

  for (const seedUser of usersToSeed) {
    const existing = await userRepository.findOne({
      where: [{ email: seedUser.email }, { codiceDipendente: seedUser.codiceDipendente }],
    });

    if (existing) {
      existing.nome = seedUser.nome;
      existing.cognome = seedUser.cognome;
      existing.ruolo = seedUser.ruolo;
      existing.attivo = true;
      existing.dataAssunzione = existing.dataAssunzione || '2024-01-01';
      // Keep seed credentials deterministic in MVP environments.
      existing.passwordHash = await argon2.hash(seedUser.password);

      const saved = await userRepository.save(existing);
      seededUsers.push(saved);
      continue;
    }

    const created = userRepository.create({
      email: seedUser.email,
      codiceDipendente: seedUser.codiceDipendente,
      nome: seedUser.nome,
      cognome: seedUser.cognome,
      ruolo: seedUser.ruolo,
      attivo: true,
      dataAssunzione: '2024-01-01',
      passwordHash: await argon2.hash(seedUser.password),
      note: 'Seed MVP',
    });

    const saved = await userRepository.save(created);
    seededUsers.push(saved);
  }

  return seededUsers;
}

async function upsertCommesse(createdBy?: string): Promise<CommessaEntity[]> {
  const commesseRepository = AppDataSource.getRepository(CommessaEntity);
  const seededCommesse: CommessaEntity[] = [];

  for (const seedCommessa of commesseToSeed) {
    const existing = await commesseRepository.findOne({
      where: { nome: seedCommessa.nome },
    });

    if (existing) {
      existing.descrizione = seedCommessa.descrizione;
      existing.attiva = true;
      if (!existing.codiceQrAttivo) {
        existing.codiceQrAttivo = randomUUID();
      }
      if (!existing.createdBy && createdBy) {
        existing.createdBy = createdBy;
      }

      const saved = await commesseRepository.save(existing);
      seededCommesse.push(saved);
      continue;
    }

    const created = commesseRepository.create({
      nome: seedCommessa.nome,
      descrizione: seedCommessa.descrizione,
      attiva: true,
      codiceQrAttivo: randomUUID(),
      createdBy,
    });

    const saved = await commesseRepository.save(created);
    seededCommesse.push(saved);
  }

  return seededCommesse;
}

async function run(): Promise<void> {
  console.log('Starting MVP seed...');

  await AppDataSource.initialize();

  try {
    const seededUsers = await upsertUsers();
    const admin = seededUsers.find((user) => user.ruolo === RoleEnum.ADMIN);
    const seededCommesse = await upsertCommesse(admin?.id);

    console.log(`Seed completed: ${seededUsers.length} users, ${seededCommesse.length} commesse.`);
    console.log('Users:');
    seededUsers.forEach((user) => {
      console.log(`- ${user.email} (${user.ruolo})`);
    });
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((error) => {
  console.error('MVP seed failed:', error);
  process.exit(1);
});
