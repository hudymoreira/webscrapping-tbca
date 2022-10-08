import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("nutrients", (table: Knex.TableBuilder) => {
    table.increments("id").primary().notNullable();
    table.string("food_code").notNullable();
    table.string("component").notNullable();
    table.string("unity").notNullable();
    table.decimal("value").notNullable();
    table.decimal("standard_deviation").notNullable();
    table.decimal("min_value").notNullable();
    table.decimal("max_value").notNullable();
    table.integer("number_of_data").notNullable();
    table.string("references").notNullable();
    table.string("type_of_data").notNullable();

    //create foreing key
    table.foreign("food_code").references("foods.code");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("nutrients");
}
