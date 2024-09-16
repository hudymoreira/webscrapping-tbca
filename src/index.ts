import axios from "axios";
import * as cheerio from "cheerio";
import { createWriteStream } from "fs";
import http from "http";
import * as dotenv from "dotenv";
dotenv.config();

import knex from "../database/connection";

const PAGES = 57;
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
    const rows = $(".table tbody tr").toArray(); // Pega todas as linhas da tabela

    for (const row of rows) {
      const tds = $(row).find("td").toArray(); // Pega todas as células da linha
      const [codeTd, portugueseNameTd, nameTd, cientificNameTd, groupTd, brandTd] = tds;

      const code = $(codeTd).text().trim();               // Código do produto
      const portugueseName = $(portugueseNameTd).text().trim(); // Nome em português
      const name = $(nameTd).text().trim() || '';          // Nome comum (pode ser vazio)
      const cientificName = $(cientificNameTd).text().trim() || ''; // Nome científico (pode ser vazio)
      const group = $(groupTd).text().trim() || '';        // Grupo de alimentos
      const brand = $(brandTd).text().trim() || '';        // Marca (pode ser vazio)

      // Garante que todos os valores estão atribuídos corretamente
      const food: Food = {
        code,
        portugueseName,
        name,
        cientificName,
        group,
        brand,
        // nutrients,
      };

      // Log do objeto Food antes de ser retornado
      console.log('Created Food object:', food);

      yield food;
    }

  }
}


async function* getNutrients(code: string): AsyncGenerator<Nutrients> {
  const TARGET_URL = `http://www.tbca.net.br/base-dados/int_composicao_estatistica.php`;
  const { data } = await axiosClient.get(TARGET_URL, {
    params: { cod_produto: code },
  });

  // Log dos dados brutos
  console.log(`Fetched data for code ${code}:`, data);

  const $ = cheerio.load(data);
  const tds = $("#tabela1 tbody tr")
    .children()
    .toArray()
    .map((td) => $(td).text());

  // Log dos dados extraídos
  console.log('Extracted table data:', tds);

  const NUMBER_OF_FIELDS = 9;

  for (const index in tds) {
    const valueInt = parseInt(index);

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

      const nutrient: Nutrients = {
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

      // Log do objeto Nutrients antes de ser retornado
      console.log('Created Nutrients object:', nutrient);

      yield nutrient;
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
      //console.log(food)
  }

}

async function getNutrientsAndInsertInDB() {
  const results = await knex<Pick<Food, "code">>("foods").select("code");

  for (const { code } of results) {
    for await (const nutrient of getNutrients(code)) {
      const nutrientToInsert: NutrientsDB = {
        food_code: code,
        component: nutrient.component,
        unity: nutrient.unity,
        value: parseFloat(nutrient.value.replace(',', '.')) || 0, // Convertendo para número, substituindo ',' por '.' e tratando NaN
        standard_deviation: nutrient.standardDeviation === '-' ? '0' : nutrient.standardDeviation,
        min_value: parseFloat(nutrient.minValue.replace(',', '.')) || 0, // Convertendo para número, substituindo ',' por '.' e tratando NaN
        max_value: parseFloat(nutrient.maxValue.replace(',', '.')) || 0, // Convertendo para número, substituindo ',' por '.' e tratando NaN
        number_of_data: parseInt(nutrient.numberOfData, 10) || 0, // Convertendo para número e tratando NaN
        references: nutrient.references === '-' ? '0' : nutrient.references,
        type_of_data: nutrient.typeOfData,
      };
      
      // Log do objeto NutrientsDB antes de inserir
      console.log('Nutrient to insert:', nutrientToInsert);

      try {
        const [insertedId] = await knex("nutrients").insert(nutrientToInsert);

        console.log(
          `Nutrient with ID: ${insertedId} from food with CODE: ${code} has been created`
        );
      } catch (error) {
        console.error('Error inserting nutrient:', error);
      }
    }
  }
}


getFoodsAndInsertInDB();
getNutrientsAndInsertInDB();
