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
