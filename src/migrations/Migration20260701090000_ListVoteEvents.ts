import { Migration } from '@mikro-orm/migrations';

export class Migration20260701090000_ListVoteEvents extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'alter table `vote_events` add `option_a_participant_count` int not null default 0, add `option_b_participant_count` int not null default 0;',
    );
    this.addSql(
      'alter table `vote_events` add index `vote_events_ongoing_deadline_id_index` (`deadline_at`, `id`);',
    );
    this.addSql(
      'alter table `vote_events` add index `vote_events_ongoing_main_index` (`deadline_at`, `total_participant_count`, `id`);',
    );

    this.addSql(
      'create table `vote_event_participations` (`id` varchar(36) not null, `vote_event_id` varchar(36) not null, `user_id` varchar(36) not null, `created_at` datetime not null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;',
    );
    this.addSql(
      'alter table `vote_event_participations` add unique `vote_event_participations_vote_event_user_unique` (`vote_event_id`, `user_id`);',
    );
    this.addSql(
      'alter table `vote_event_participations` add index `vote_event_participations_user_id_index` (`user_id`);',
    );
    this.addSql(
      'alter table `vote_event_participations` add constraint `vote_event_participations_vote_event_id_foreign` foreign key (`vote_event_id`) references `vote_events` (`id`) on delete cascade;',
    );
    this.addSql(
      'alter table `vote_event_participations` add constraint `vote_event_participations_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on delete cascade;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql('drop table if exists `vote_event_participations`;');
    this.addSql(
      'alter table `vote_events` drop index `vote_events_ongoing_deadline_id_index`;',
    );
    this.addSql(
      'alter table `vote_events` drop index `vote_events_ongoing_main_index`;',
    );
    this.addSql(
      'alter table `vote_events` drop column `option_a_participant_count`, drop column `option_b_participant_count`;',
    );
  }
}
