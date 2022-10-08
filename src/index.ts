import axios from "axios";
import * as cheerio from "cheerio";
import { createWriteStream } from "fs";
import http from "http";
import * as dotenv from "dotenv";
dotenv.config();

import knex from "../database/connection";

const PAGES = 55;
const axiosClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
});

interface Food {
  code: string;
  portugueseName: string;
  name: string;
  cientificName: string;
  group: string;
  brand: string;
  nutrients?: Nutrients[];
}

interface Nutrients {
  component: string;
  unity: string;
  value: string;
  standardDeviation: string;
  minValue: string;
  maxValue: string;
  numberOfData: string;
  references: string;
  typeOfData: string;
}

interface NutrientsDB {
  id?: number;
  component: string;
  food_code: string;
  unity: string;
  value: number;
  standard_deviation: string;
  min_value: number;
  max_value: number;
  number_of_data: number;
  references: string;
  type_of_data: string;
}

async function* getAllFoods(): AsyncGenerator<Food> {
  for (let page = 1; page <= PAGES; page++) {
    const TARGET_URL = `http://www.tbca.net.br/base-dados/composicao_alimentos.php`;
    const { data } = await axiosClient.get(TARGET_URL, {
      params: { pagina: page.toString() },
    });

    const $ = cheerio.load(data);
    const tds = $(".table tbody tr")
      .children()
      .toArray()
      .map((td) => $(td).text());

    const NUMBER_OF_FIELDS = 6;

    for (const valor in tds) {
      const valueInt = parseInt(valor);

      if (valueInt % NUMBER_OF_FIELDS === 0) {
        const [code, portugueseName, name, cientificName, group, brand] =
          tds.slice(valueInt, valueInt + NUMBER_OF_FIELDS);

        //const nutrients = await getNutrients(code);
        yield {
          code,
          portugueseName,
          name,
          cientificName,
          group,
          brand,
          //nutrients,
        };
      }
    }
  }
}

async function* getNutrients(code: string): AsyncGenerator<Nutrients> {
  const TARGET_URL = `http://www.tbca.net.br/base-dados/int_composicao_estatistica.php`;
  const { data } = await axiosClient.get(TARGET_URL, {
    params: { cod_produto: code },
  });

  const $ = cheerio.load(data);
  const tds = $("#tabela1 tbody tr")
    .children()
    .toArray()
    .map((td) => $(td).text());

  for (const index in tds) {
    const valueInt = parseInt(index);
    const NUMBER_OF_FIELDS = 9;

    if (valueInt % NUMBER_OF_FIELDS === 0) {
      const [
        component,
        unity,
        value,
        standardDeviation,
        minValue,
        maxValue,
        numberOfData,
        references,
        typeOfData,
      ] = tds.slice(valueInt, valueInt + NUMBER_OF_FIELDS);

      yield {
        component,
        unity,
        value,
        standardDeviation,
        minValue,
        maxValue,
        numberOfData,
        references,
        typeOfData,
      };
    }
  }
}

async function getFoodsAndInsertInDB() {
  for await (const food of getAllFoods()) {
    const { code, portugueseName, name, cientificName, group, brand } = food;
    const foodToInsert = {
      code,
      portuguese_name: portugueseName,
      name,
      cientific_name: cientificName,
      group,
      brand,
    };

    const [insertedId] = await knex("foods").insert(foodToInsert);

    console.log(`food with ID: ${insertedId} has been created`);
  }
}

async function getNutrientsAndInsertInDB() {
  const results = await knex<Pick<Food, "code">>("foods").select("code");

  for (const { code } of results) {
    for await (const nutrient of getNutrients(code)) {
      const nutrientToInsert: NutrientsDB = {
        food_code: code,
        ...nutrient,
        max_value: nutrient.maxValue,
        min_value: nutrient.minValue,
        number_of_data: nutrient.numberOfData,
        standard_deviation: nutrient.standardDeviation,
        type_of_data: nutrient.typeOfData,
      };

      const [insertedId] = await knex("nutrients").insert(nutrientToInsert);

      console.log(
        `nutrient with ID: ${insertedId} from food with CODE: ${code} has been created`
      );
    }
  }
}

//getFoodsAndInsertInDB();
getNutrientsAndInsertInDB();
