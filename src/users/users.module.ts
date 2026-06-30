import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AffiliationsModule } from '../affiliations/affiliations.module';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import {
  MikroOrmUsersRepository,
  UsersRepository,
} from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [AffiliationsModule, MikroOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: MikroOrmUsersRepository },
  ],
})
export class UsersModule {}
