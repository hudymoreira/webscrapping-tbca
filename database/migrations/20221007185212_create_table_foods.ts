import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("foods", (table: Knex.TableBuilder) => {
    table.increments("id").primary().notNullable();
    table.string("code").index().notNullable();
    table.string("portuguese_name").notNullable();
    table.string("name").notNullable();
    table.string("cientific_name").notNullable();
    table.string("group").notNullable();
    table.string("brand").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("foods");
}
