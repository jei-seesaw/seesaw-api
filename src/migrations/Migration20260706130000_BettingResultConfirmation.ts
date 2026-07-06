import { Migration } from '@mikro-orm/migrations';

export class Migration20260706130000_BettingResultConfirmation extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'alter table `vote_events` add `betting_result_option` varchar(1) null, add `betting_result_confirmed_at` datetime null;',
    );
    this.addSql(
      'alter table `vote_events` add index `vote_events_betting_result_confirmed_at_index` (`betting_result_confirmed_at`);',
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table `vote_events` drop index `vote_events_betting_result_confirmed_at_index`;',
    );
    this.addSql(
      'alter table `vote_events` drop column `betting_result_option`, drop column `betting_result_confirmed_at`;',
    );
  }
}
