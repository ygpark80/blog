import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./src/drizzle/bananastand",
	dialect: "mysql",
	dbCredentials: {
		url: "mysql://root:rootpassword@localhost:3306/bananastand"
	}
})
