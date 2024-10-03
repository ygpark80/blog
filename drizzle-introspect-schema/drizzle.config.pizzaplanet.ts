import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./src/drizzle/pizzaplanet",
	dialect: "mysql",
	dbCredentials: {
		url: "mysql://root:rootpassword@localhost:3306/pizzaplanet"
	}
})
