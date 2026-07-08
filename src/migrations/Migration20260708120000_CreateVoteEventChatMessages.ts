import { Migration } from '@mikro-orm/migrations';

export class Migration20260708120000_CreateVoteEventChatMessages extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'create table `vote_event_chat_messages` (`id` varchar(36) not null, `vote_event_id` varchar(36) not null, `user_id` varchar(36) not null, `client_message_id` varchar(36) not null, `content` varchar(500) not null, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
    this.addSql(
      'alter table `vote_event_chat_messages` add unique `vote_event_chat_messages_user_client_unique` (`user_id`, `client_message_id`);',
    );
    this.addSql(
      'alter table `vote_event_chat_messages` add index `vote_event_chat_messages_vote_event_created_id_index` (`vote_event_id`, `created_at`, `id`);',
    );
    this.addSql(
      'alter table `vote_event_chat_messages` add constraint `vote_event_chat_messages_vote_event_id_foreign` foreign key (`vote_event_id`) references `vote_events` (`id`) on delete cascade;',
    );
    this.addSql(
      'alter table `vote_event_chat_messages` add constraint `vote_event_chat_messages_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on delete cascade;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table `vote_event_chat_messages` drop foreign key `vote_event_chat_messages_vote_event_id_foreign`;',
    );
    this.addSql(
      'alter table `vote_event_chat_messages` drop foreign key `vote_event_chat_messages_user_id_foreign`;',
    );
    this.addSql('drop table if exists `vote_event_chat_messages`;');
  }
}
