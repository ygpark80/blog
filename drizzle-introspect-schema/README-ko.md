# Drizzle ORM에서 Drizzle Kit을 사용하여 MySQL의 다중 스키마 처리하기

최근 회사에서, MSA(마이크로서비스 아키텍처)를 염두에 두고 구축된 새로운 API 서버에서 기존의 여러 스키마가 있는 데이터베이스 디자인을 사용해야 했습니다. 각 비즈니스 도메인이 여러 스키마로 분리되어 `users`와 같은 테이블이 여러 스키마에 분산되어 있었습니다. 이는 복잡성을 초래했고, 엔지니어 인원이 10명 미만인 소규모 팀이었기 때문에, `users` 테이블을 동기화하는 대신 스키마 간의 JOIN 연산을 사용하기로 했습니다. Drizzle ORM에서 이러한 JOIN 연산을 수행하려면 스키마를 명시해야 했습니다.

기존의 여러 스키마와 수많은 테이블을 포함하는 데이터베이스 디자인을 재사용하는 상황이었기 때문에, Drizzle 스키마 파일을 수동으로 작성하는 번거롭고 오류가 발생할 수 있는 작업을 피하고 싶었습니다. 그래서 [Drizzle Kit Introspect / Pull](https://orm.drizzle.team/kit-docs/commands#introspect--pull)을 사용하기로 했습니다. Drizzle ORM은 [PostgreSQL 및 MySQL dialect에서 스키마를 선언하는 방법](https://orm.drizzle.team/docs/schemas)을 제공하지만, [Drizzle Kit Introspect / Pull](https://orm.drizzle.team/kit-docs/commands#introspect--pull)은 아직 `drizzle-kit introspect` 명령어에서 스키마 이름을 추가하는 것을 지원하지 않습니다.

> **참고**: 이 문서에서는 *schema*라는 용어를 PostgreSQL 또는 Oracle과 같은 데이터베이스에서 테이블 및 기타 데이터베이스 객체의 논리적 그룹을 설명하는 용어로 사용합니다. MySQL에서는 *schema* 대신 *database*라는 용어를 자주 사용합니다. MySQL에서 이 두 용어는 기능적으로 동일하므로, 여기에서 *schema*라고 언급하는 것은 MySQL에서 말하는 *database*와 동일합니다.

## 여러 스키마를 사용하는 샘플 데이터베이스 생성

두 개의 스키마와 간단한 테이블 및 데이터를 생성해 보겠습니다.

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

데이터베이스를 실행하려면 Docker Compose를 사용합니다.

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

이제 데이터베이스를 실행해 보겠습니다.

> 3306 포트에서 다른 서버가 실행 중이지 않은지 확인하십시오.

```bash
docker compose up -d
```

데이터베이스가 이제 사용할 준비가 되었습니다. `mysql` 명령어를 사용해 확인해 보십시오.

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

## Drizzle Introspection 구성

각 스키마에 대해 두 개의 Drizzle 구성을 만듭니다.

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

`drizzle-kit introspect`를 실행하기 위한 `package.json`을 생성합니다.

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

`yarn drizzle:pull`을 실행하여 스키마를 가져온 후, 생성된 파일 중 하나를 확인해 봅니다.

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

위 코드는 `mysqlTable`을 사용하여 테이블을 정의합니다. 스키마를 명시하려면 수동으로 `mysqlSchema`를 추가해야 합니다.

```typescript
// src/drizzle/bananastand/schema.ts
export const mySchema = mysqlSchema("bananastand")

export const bananas = mySchema.table("bananas", {
    // ...
})
```

## 스키마 변환

많은 스키마가 있을 경우 수동으로 작업하기 힘들기 때문에 이를 자동화할 스크립트를 만들어 봅니다.

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

생성된 스키마를 변환하기 위해 필요한 스크립트를 `package.json`에 추가합니다.

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

이제 `yarn drizzle:pull`을 실행하고 생성된 파일을 다시 확인합니다.

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

이제 `mysqlSchema`와 `mySchema.table`을 사용하는 것으로 스키마 변환을 성공적으로 완료했습니다!

## 스키마 사용하기

이제 Drizzle ORM을 사용하여 스키마를 기반으로 데이터베이스에서 쿼리를 실행해 봅시다.

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

이제 `main.ts`를 `npx tsx src/main.ts`로 실행하면 다음과 같은 결과가 출력됩니다.

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

쿼리 로그에서 테이블 이름에 스키마 이름이 포함된 것을 확인할 수 있습니다, 예: `` `bananastand`.`bananas` ``

Voilà! 이제 Drizzle ORM에서 스키마 이름을 사용하여 데이터베이스에 성공적으로 쿼리를 수행했습니다!

이 문서에서 작업된 코드는 [여기](./)에서 확인할 수 있습니다.
