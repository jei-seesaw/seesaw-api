import { Migration } from '@mikro-orm/migrations';

export class Migration20260630120000_UserSignupConstraints extends Migration {
  override isTransactional(): boolean {
    return false;
  }

  override async up(): Promise<void> {
    await this.dropForeignKeyIfExists('users_affiliation_code_foreign');
    await this.dropForeignKeyIfExists('users_affiliation_id_foreign');

    if (await this.hasColumn('users', 'affiliation_id')) {
      await this.execute(
        'alter table `users` change `affiliation_id` `affiliation_code` varchar(50) null;',
      );

      if (await this.hasColumn('affiliations', 'id')) {
        await this.execute(
          'update `users` u join `affiliations` a on u.`affiliation_code` = a.`id` set u.`affiliation_code` = a.`code`;',
        );
      }
    }

    if (await this.hasIndex('users', 'users_affiliation_id_index')) {
      await this.execute('alter table `users` drop index `users_affiliation_id_index`;');
    }

    if (await this.hasColumn('affiliations', 'id')) {
      await this.execute('alter table `affiliations` drop primary key;');

      if (await this.hasIndex('affiliations', 'affiliations_code_unique')) {
        await this.execute(
          'alter table `affiliations` drop index `affiliations_code_unique`;',
        );
      }

      await this.execute('alter table `affiliations` add primary key (`code`);');
      await this.execute('alter table `affiliations` drop column `id`;');
    }

    await this.execute(
      'alter table `users` modify `affiliation_code` varchar(50) not null;',
    );
    await this.execute(
      'alter table `users` modify `vote_token` int not null default 1000;',
    );

    if (!(await this.hasIndex('users', 'users_affiliation_code_index'))) {
      await this.execute(
        'alter table `users` add index `users_affiliation_code_index` (`affiliation_code`);',
      );
    }

    if (!(await this.hasForeignKey('users_affiliation_code_foreign'))) {
      await this.execute(
        'alter table `users` add constraint `users_affiliation_code_foreign` foreign key (`affiliation_code`) references `affiliations` (`code`);',
      );
    }
  }

  override async down(): Promise<void> {
    await this.dropForeignKeyIfExists('users_affiliation_code_foreign');
    await this.execute(
      'alter table `users` modify `affiliation_code` varchar(50) null;',
    );
    await this.execute(
      'alter table `users` modify `vote_token` int not null default 0;',
    );
    await this.execute(
      'alter table `users` add constraint `users_affiliation_code_foreign` foreign key (`affiliation_code`) references `affiliations` (`code`) on delete set null;',
    );
  }

  private async dropForeignKeyIfExists(name: string): Promise<void> {
    if (await this.hasForeignKey(name)) {
      await this.execute(`alter table \`users\` drop foreign key \`${name}\`;`);
    }
  }

  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const rows = await this.execute(
      `select 1 from \`information_schema\`.\`columns\` where \`table_schema\` = database() and \`table_name\` = '${tableName}' and \`column_name\` = '${columnName}';`,
    );

    return rows.length > 0;
  }

  private async hasForeignKey(name: string): Promise<boolean> {
    const rows = await this.execute(
      `select 1 from \`information_schema\`.\`table_constraints\` where \`table_schema\` = database() and \`table_name\` = 'users' and \`constraint_name\` = '${name}' and \`constraint_type\` = 'FOREIGN KEY';`,
    );

    return rows.length > 0;
  }

  private async hasIndex(tableName: string, indexName: string): Promise<boolean> {
    const rows = await this.execute(
      `select 1 from \`information_schema\`.\`statistics\` where \`table_schema\` = database() and \`table_name\` = '${tableName}' and \`index_name\` = '${indexName}';`,
    );

    return rows.length > 0;
  }
}
