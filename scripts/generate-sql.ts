import { execSync } from "child_process"
import * as fs from "fs"

// This script generates the SQLite schema from the Prisma schema
// by using prisma introspection (workaround for libsql CLI limitation)

// Since prisma db pull doesn't work with libsql CLI, we'll create a temporary
// local SQLite database, let Prisma create the schema there, then extract it

const tempDbPath = "/tmp/schema-gen.db"

try {
  // Create a temporary SQLite database
  execSync(`sqlite3 ${tempDbPath} ".tables"`, { stdio: "ignore" })

  // Set DATABASE_URL to the temp DB and run Prisma to generate schema
  const env = { ...process.env, DATABASE_URL: `file:${tempDbPath}` }
  execSync("npx prisma db push --skip-generate", { env, stdio: "pipe" })

  // Extract the schema as SQL
  const sql = execSync(`sqlite3 ${tempDbPath} ".schema"`, { encoding: "utf-8" })

  console.log("Generated SQL schema:")
  console.log(sql)

  // Clean up
  fs.unlinkSync(tempDbPath)
} catch (error) {
  console.error("Error generating schema:", error)
  process.exit(1)
}
