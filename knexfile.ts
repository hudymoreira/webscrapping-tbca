import type { Knex } from "knex";

import * as dotenv from "dotenv";
dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: "localhost",
      port: process.env.DB_PORT as number | undefined,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations",
    },
  },
  //to configure
  production: {
    client: "postgresql",
    connection: {
      database: "my_db",
      user: "username",
      password: "password",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations",
    },
  },
};

export default config;
