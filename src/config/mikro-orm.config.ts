import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/mariadb';
import { Affiliation } from '../affiliations/affiliation.entity';
import { ChatMessage } from '../chats/chat-message.entity';
import { User } from '../users/user.entity';
import { VoteEventParticipation } from '../vote-events/vote-event-participation.entity';
import { VoteEvent } from '../vote-events/vote-event.entity';
import { loadEnvFiles, validateEnv } from './env';

loadEnvFiles();

const env = validateEnv(process.env);

export default defineConfig({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  dbName: env.DB_NAME,
  entities: [Affiliation, ChatMessage, User, VoteEvent, VoteEventParticipation],
  extensions: [Migrator],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
  },
});
