import { Migration } from '@mikro-orm/migrations';

export class Migration20260630000000_CreateUsersTable extends Migration {
  override up(): void {
    this.addSql(
      'create table `users` (`id` varchar(36) not null, `email` varchar(255) not null, `name` varchar(120) not null, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists `users`;');
  }
}
