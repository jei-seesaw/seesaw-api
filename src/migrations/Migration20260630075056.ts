import { Migration } from '@mikro-orm/migrations';

export class Migration20260630075056 extends Migration {
  override up(): void | Promise<void> {
    this.addSql('drop table if exists `users`;');

    this.addSql(
      'create table `affiliations` (`code` varchar(50) not null, `name` varchar(50) not null, `created_at` datetime not null, primary key (`code`)) default character set utf8mb4 engine = InnoDB;',
    );
    this.addSql(
      "insert into `affiliations` (`code`, `name`, `created_at`) values ('teacher', '선생님', current_timestamp()), ('headquarters', '본사', current_timestamp());",
    );

    this.addSql(
      'create table `users` (`id` varchar(36) not null, `nickname` varchar(120) not null, `password_hash` varchar(255) not null, `affiliation_code` varchar(50) null, `vote_token` int not null default 0, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
    this.addSql(
      'alter table `users` add unique `users_nickname_unique` (`nickname`);',
    );
    this.addSql(
      'alter table `users` add index `users_affiliation_code_index` (`affiliation_code`);',
    );
    this.addSql(
      'alter table `users` add constraint `users_affiliation_code_foreign` foreign key (`affiliation_code`) references `affiliations` (`code`) on delete set null;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql('drop table if exists `users`;');
    this.addSql('drop table if exists `affiliations`;');

    this.addSql(
      'create table `users` (`id` varchar(36) not null, `email` varchar(255) not null, `name` varchar(120) not null, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
  }
}
