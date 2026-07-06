import { Migration } from '@mikro-orm/migrations';

export class Migration20260706121000_RenameBusinessGroupAffiliation extends Migration {
  override up(): void {
    this.addSql(
      "update `affiliations` set `name` = '사업조직' where `code` = 'business-group';",
    );
  }

  override down(): void {
    this.addSql(
      "update `affiliations` set `name` = concat('사업', '조') where `code` = 'business-group';",
    );
  }
}
