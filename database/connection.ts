import knexfile from "../knexfile";
import knex from "knex";

const mode = process.env.MODE as string;

export default knex(knexfile[mode]);
