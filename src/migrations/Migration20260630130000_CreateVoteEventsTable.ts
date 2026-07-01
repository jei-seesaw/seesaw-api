import { Migration } from '@mikro-orm/migrations';

export class Migration20260630130000_CreateVoteEventsTable extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'create table `vote_events` (`id` varchar(36) not null, `category` varchar(20) not null, `title` varchar(120) not null, `option_a` varchar(120) not null, `option_b` varchar(120) not null, `option_a_image_url` varchar(2048) null, `option_b_image_url` varchar(2048) null, `total_participant_count` int not null default 0, `total_token_amount` int not null default 0, `option_a_token_amount` int not null default 0, `option_b_token_amount` int not null default 0, `deadline_at` datetime not null, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql('drop table if exists `vote_events`;');
  }
}
