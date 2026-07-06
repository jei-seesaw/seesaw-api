import { Migration } from '@mikro-orm/migrations';

export class Migration20260706120000_ReplaceAffiliationMetadata extends Migration {
  override up(): void {
    this.addSql(
      "insert into `affiliations` (`code`, `name`, `created_at`) values ('education', '재능교육', current_timestamp()), ('holdings', '재능홀딩스', current_timestamp()), ('broadcasting', '재능방송', current_timestamp()), ('retail', '재능유통', current_timestamp()), ('printing', '재능인쇄', current_timestamp()), ('e-academy', '재능e아카데미', current_timestamp()), ('self-learning', '재능셀프러닝', current_timestamp()), ('business-group', '사업조', current_timestamp()) on duplicate key update `name` = values(`name`);",
    );
    this.addSql(
      "update `users` set `affiliation_code` = 'education' where `affiliation_code` in (concat('teac', 'her'), concat('head', 'quarters'));",
    );
    this.addSql(
      "delete from `affiliations` where `code` in (concat('teac', 'her'), concat('head', 'quarters'));",
    );
  }

  override down(): void {
    this.addSql(
      "insert into `affiliations` (`code`, `name`, `created_at`) values (concat('teac', 'her'), concat('선', '생님'), current_timestamp()), (concat('head', 'quarters'), concat('본', '사'), current_timestamp()) on duplicate key update `name` = values(`name`);",
    );
    this.addSql(
      "update `users` set `affiliation_code` = concat('teac', 'her') where `affiliation_code` in ('education', 'holdings', 'broadcasting', 'retail', 'printing', 'e-academy', 'self-learning', 'business-group');",
    );
    this.addSql(
      "delete from `affiliations` where `code` in ('education', 'holdings', 'broadcasting', 'retail', 'printing', 'e-academy', 'self-learning', 'business-group');",
    );
  }
}
