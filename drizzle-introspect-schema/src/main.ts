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
const db = drizzle(conn, { logger: true })

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
