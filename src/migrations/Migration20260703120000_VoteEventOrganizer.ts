import { Migration } from '@mikro-orm/migrations';

export class Migration20260703120000_VoteEventOrganizer extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'alter table `vote_events` add `organizer_user_id` varchar(36) null;',
    );
    this.addSql(
      'alter table `vote_events` add index `vote_events_organizer_created_id_index` (`organizer_user_id`, `created_at`, `id`);',
    );
    this.addSql(
      'alter table `vote_events` add constraint `vote_events_organizer_user_id_foreign` foreign key (`organizer_user_id`) references `users` (`id`) on delete set null;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table `vote_events` drop foreign key `vote_events_organizer_user_id_foreign`;',
    );
    this.addSql(
      'alter table `vote_events` drop index `vote_events_organizer_created_id_index`;',
    );
    this.addSql('alter table `vote_events` drop column `organizer_user_id`;');
  }
}
