import { text, boolean } from 'drizzle-orm/pg-core';
import { stores } from '../schema/tenant';

interface MigrationDb {
  schema: {
    alterTable: (table: unknown) => {
      addColumn: (name: string, column: unknown) => { run: () => Promise<void> };
      dropColumn: (name: string) => { run: () => Promise<void> };
    };
  };
}

export const up = async (db: MigrationDb) => {
  await db.schema.alterTable(stores).addColumn('locale', text('locale').notNull().default('en')).run();
  await db.schema.alterTable(stores).addColumn('domain_verified', boolean('domain_verified').notNull().default(false)).run();
};

export const down = async (db: MigrationDb) => {
  await db.schema.alterTable(stores).dropColumn('locale').run();
  await db.schema.alterTable(stores).dropColumn('domain_verified').run();
};
