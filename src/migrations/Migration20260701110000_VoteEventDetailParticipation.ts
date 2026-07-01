import { Migration } from '@mikro-orm/migrations';

export class Migration20260701110000_VoteEventDetailParticipation extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'alter table `vote_event_participations` add `selected_option` varchar(1) null, add `token_amount` int not null default 0;',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table `vote_event_participations` drop column `selected_option`, drop column `token_amount`;',
    );
  }
}
