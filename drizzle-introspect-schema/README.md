# Using Multiple Schemas with MySQL in Drizzle ORM using Drizzle Kit

Recently, at my company, I needed to use an existing database design with multiple schemas for a new API server, which was built with MSA (Microservices Architecture) in mind. Each business domain was divided into multiple schemas, so tables like `users` were scattered across different schemas. This led to complexity, and given our small team size (fewer than 10 engineers), rather than synchronizing tables like `users`, we decided to use `JOIN` operations across schemas. To perform these `JOIN` operations in Drizzle ORM, the schema needed to be specified.

Since I was reusing an existing database design, which contained multiple schemas with many tables, I wanted to avoid the tedious and error-prone process of manually coding Drizzle schema files. Therefore, I opted to use [Drizzle Kit Introspect / Pull](https://orm.drizzle.team/kit-docs/commands#introspect--pull). While Drizzle ORM provides a way to [declare an entity with a schema for PostgreSQL and MySQL dialects](https://orm.drizzle.team/docs/schemas), [Drizzle Kit Introspect / Pull](https://orm.drizzle.team/kit-docs/commands#introspect--pull) does not yet support adding a schema name in the `drizzle-kit introspect` command.



> **Note**: In this document, the term *schema* is used to describe the logical grouping of tables and other database objects, similar to how it is used in databases like PostgreSQL or Oracle. In MySQL, the term *database* is often used instead of schema. Functionally, they are the same in MySQL, so whenever we refer to *schema*, it is equivalent to what MySQL calls a *database*.

## Creating a Sample Database with Multiple Schemas

Let's create two schemas with simple tables and data in them.

```sql
-- Create the bananastand database
CREATE DATABASE IF NOT EXISTS bananastand;

-- Switch to bananastand database
USE bananastand;

-- Create bananas table
CREATE TABLE IF NOT EXISTS bananas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    ripeness_level ENUM('Unripe', 'Ripe', 'Overripe') NOT NULL,
    price DECIMAL(5, 2) NOT NULL,
    date_received DATE NOT NULL
);

-- Insert some sample data into bananas table
INSERT INTO bananas (type, ripeness_level, price, date_received) VALUES
('Cavendish', 'Ripe', 1.20, '2024-10-01'),
('Plantain', 'Unripe', 0.90, '2024-10-02'),
('Red Banana', 'Overripe', 1.50, '2024-10-03');


-- Create the pizzaplanet database
CREATE DATABASE IF NOT EXISTS pizzaplanet;

-- Switch to pizzaplanet database
USE pizzaplanet;

-- Create pizzas table
CREATE TABLE IF NOT EXISTS pizzas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    toppings TEXT NOT NULL,
    size ENUM('Small', 'Medium', 'Large', 'Extra Large') NOT NULL,
    price DECIMAL(6, 2) NOT NULL
);

-- Create special_ingredients table linking pizzaplanet with bananastand
CREATE TABLE IF NOT EXISTS special_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pizza_id INT NOT NULL,
    banana_id INT NOT NULL,
    amount_needed INT NOT NULL,
    FOREIGN KEY (pizza_id) REFERENCES pizzas(id),
    FOREIGN KEY (banana_id) REFERENCES bananastand.bananas(id) ON DELETE CASCADE
);

-- Insert some sample data into pizzas table
INSERT INTO pizzas (name, toppings, size, price) VALUES
('Banana Deluxe', 'Banana, Cheese, Tomato Sauce', 'Large', 15.99),
('Tropical Banana Special', 'Banana, Pineapple, Ham, Cheese', 'Medium', 13.50);

-- Insert some sample data into special_ingredients table
INSERT INTO special_ingredients (pizza_id, banana_id, amount_needed) VALUES
(1, 1, 2),  -- Banana Deluxe uses 2 Cavendish bananas
(2, 2, 3);  -- Tropical Banana Special uses 3 Plantain bananas
```

To launch the database, let's use Docker Compose.

```yaml
// docker-compose.yml
services:
  db:
    image: mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
    ports:
      - "3306:3306"
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/1.sql
```

Now, let's run the database.

> Ensure that no other servers are running on port 3306.

```bash
docker compose up -d
```

The database is now ready to use. Verify it using the `mysql` command.

```
% mysql -h 127.0.0.1 -u root -prootpassword -e "\
SELECT pizzas.name AS pizza_name, \
bananas.type AS banana_type, \
bananas.ripeness_level as banana_ripeness, \
special_ingredients.amount_needed \
FROM pizzaplanet.pizzas \
JOIN pizzaplanet.special_ingredients ON pizzas.id = special_ingredients.pizza_id \
JOIN bananastand.bananas ON special_ingredients.banana_id = bananas.id;"
mysql: [Warning] Using a password on the command line interface can be insecure.
+-------------------------+-------------+-----------------+---------------+
| pizza_name              | banana_type | banana_ripeness | amount_needed |
+-------------------------+-------------+-----------------+---------------+
| Banana Deluxe           | Cavendish   | Ripe            |             2 |
| Tropical Banana Special | Plantain    | Unripe          |             3 |
+-------------------------+-------------+-----------------+---------------+
```

## Drizzle Configs for Introspection

Let's create two Drizzle configs for each schema.

```ts
// drizzle.config.bananastand.ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./src/drizzle/bananastand",
	dialect: "mysql",
	dbCredentials: {
		url: "mysql://root:rootpassword@localhost:3306/bananastand"
	}
})
```

```ts
// drizzle.config.pizzaplanet.ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./src/drizzle/pizzaplanet",
	dialect: "mysql",
	dbCredentials: {
		url: "mysql://root:rootpassword@localhost:3306/pizzaplanet"
	}
})
```

Let's create a `package.json` to run `drizzle-kit introspect`.

```json
{
  "name": "drizzle-introspect-schema",
  "scripts": {
    "drizzle:pull:bananastand": "drizzle-kit introspect --config drizzle.config.bananastand.ts",
    "drizzle:pull:pizzaplanet": "drizzle-kit introspect --config drizzle.config.pizzaplanet.ts",
    "drizzle:pull": "yarn drizzle:pull:bananastand && yarn drizzle:pull:pizzaplanet"
  },
  "dependencies": {
    "drizzle-orm": "^0.33.0",
    "mysql2": "^3.11.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.2",
    "tsx": "^4.19.1"
  }
}
```

Now, run `yarn drizzle:pull` to pull the schema and inspect one of the generated files.

```ts
// src/drizzle/bananastand/schema.ts
import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, mysqlEnum, decimal, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const bananas = mysqlTable("bananas", {
	id: int("id").autoincrement().notNull(),
	type: varchar("type", { length: 255 }).notNull(),
	ripenessLevel: mysqlEnum("ripeness_level", ['Unripe','Ripe','Overripe']).notNull(),
	price: decimal("price", { precision: 5, scale: 2 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateReceived: date("date_received", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		bananasId: primaryKey({ columns: [table.id], name: "bananas_id"}),
	}
});
```

The code above defines the table using `mysqlTable`. To specify the schema, we need to modify it manually using `mysqlSchema`.

```typescript
// src/drizzle/bananastand/schema.ts
export const mySchema = mysqlSchema("bananastand")

export const bananas = mySchema.table("bananas", {
    // ...
})
```

## Transforming the Schema

If you have many schemas, you won’t want to do this manually. Here’s a script to automate it.

```ts
import fs from "fs"
import path from "path"

interface Replacement {
	search: RegExp
	replace: string
}

const replacements: Replacement[] = [
]

function replace(content: string, replacements: Replacement[]) {
	for (const { search, replace } of replacements) {
		content = content.replace(search, replace)
	}
	return content
}

// main
try {
	const schema = process.argv[2]
    
    const filePath = path.join(__dirname, `./src/drizzle/${schema}/schema.ts`)
	let content = fs.readFileSync(filePath, "utf8")
    
	if (schema) {
		const schemaDeclaration = `export const mySchema = mysqlSchema("${schema}");\n`
		replacements.push({
			search: /mysqlTable\("([^"]*)",/g,
			replace: 'mySchema.table("$1",'
		})
		const lastImportIndex = content.lastIndexOf("import")
		const lastImportEndIndex = content.indexOf("\n", lastImportIndex) + 1
		content = content.slice(0, lastImportEndIndex) + "\n" + schemaDeclaration + content.slice(lastImportEndIndex)
	}

	content = replace(content, replacements)
	fs.writeFileSync(filePath, content, "utf8")
	console.info(`Import and replacements completed successfully in ${filePath}`)
} catch (error) {
	console.error("An error occurred:", error)
}
```

Add the necessary scripts to `package.json` to transform the generated schema:

```json
{
  // ...
  "scripts": {
    "drizzle:transform:bananastand": "npx tsx drizzle.transform.ts bananastand",
    "drizzle:transform:pizzaplanet": "npx tsx drizzle.transform.ts pizzaplanet",
    "drizzle:pull:bananastand": "drizzle-kit introspect --config drizzle.config.bananastand.ts && yarn drizzle:transform:bananastand",
    "drizzle:pull:pizzaplanet": "drizzle-kit introspect --config drizzle.config.pizzaplanet.ts && yarn drizzle:transform:pizzaplanet",
    "drizzle:pull": "yarn drizzle:pull:bananastand && yarn drizzle:pull:pizzaplanet"
  },
  // ...
}
```

Run `yarn drizzle:pull` and inspect the generated files again.

```ts
// src/drizzle/bananastand/schema.ts
import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, mysqlEnum, decimal, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const mySchema = mysqlSchema("bananastand");

export const bananas = mySchema.table("bananas", {
	// ...
});
```

```ts
import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, text, mysqlEnum, decimal, index, foreignKey } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const mySchema = mysqlSchema("pizzaplanet");

export const pizzas = mySchema.table("pizzas", {
	// ...
});

export const specialIngredients = mySchema.table("special_ingredients", {
	// ...
});
```

We have successfully transformed schemas to use `mysqlSchema` and `mySchema.table`!

## Using the Schema

Now, let’s use the schema to query the database using Drizzle ORM.

```ts
// src/main.ts
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import { pizzas, specialIngredients } from "./drizzle/pizzaplanet/schema"
import { bananas } from "./drizzle/bananastand/schema"

const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "rootpassword",
    port: 3306,
})
const db = drizzle(conn)

const items = await db.select({
    pizzaName: pizzas.name,
    bananaType: bananas.type,
    bananaRipeness: bananas.ripenessLevel,
    amountNeeded: specialIngredients.amountNeeded,
}).from(pizzas)
    .innerJoin(specialIngredients, eq(pizzas.id, specialIngredients.pizzaId))
    .innerJoin(bananas, eq(specialIngredients.bananaId, bananas.id))

console.log(items)

await conn.end()
```

Now, run `main.ts` using `npx tsx src/main.ts` and you should see the following output.

```
% npx tsx src/main.ts
Query: select `pizzas`.`name`, `bananas`.`type`, `bananas`.`ripeness_level`, `special_ingredients`.`amount_needed` from `pizzaplanet`.`pizzas` inner join `pizzaplanet`.`special_ingredients` on `pizzas`.`id` = `special_ingredients`.`pizza_id` inner join `bananastand`.`bananas` on `special_ingredients`.`banana_id` = `bananas`.`id`
[
  {
    pizzaName: 'Banana Deluxe',
    bananaType: 'Cavendish',
    bananaRipeness: 'Ripe',
    amountNeeded: 2
  },
  {
    pizzaName: 'Tropical Banana Special',
    bananaType: 'Plantain',
    bananaRipeness: 'Unripe',
    amountNeeded: 3
  }
]
```

Note that the query logs include the schema name in the table name, e.g., `` `bananastand`.`bananas` ``

Voilà! We have successfully queried the database using schema names in Drizzle ORM!

If you want to see codes used in this article, you can find them [here](./).
