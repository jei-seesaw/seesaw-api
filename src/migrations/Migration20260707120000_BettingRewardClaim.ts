import { Migration } from '@mikro-orm/migrations';

export class Migration20260707120000_BettingRewardClaim extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      'alter table `vote_event_participations` add `betting_reward_claimed_at` datetime null;',
    );
    this.addSql(
      "update `vote_event_participations` vep join `vote_events` ve on ve.`id` = vep.`vote_event_id` set vep.`betting_reward_claimed_at` = ve.`betting_result_confirmed_at` where ve.`category` = 'betting' and ve.`betting_result_option` is not null and ve.`betting_result_confirmed_at` is not null and vep.`selected_option` = ve.`betting_result_option`;",
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      'alter table `vote_event_participations` drop column `betting_reward_claimed_at`;',
    );
  }
}
