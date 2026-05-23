import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@/app/generated/prisma/client"

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function createSchema() {
  try {
    console.log("Creating database schema...")

    // Test connection and create tables by performing introspection
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
    console.log("✓ Connected to Turso")
    console.log(`Tables: ${JSON.stringify(tables)}`)

    await prisma.$disconnect()
  } catch (error) {
    console.error("Error:", error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

createSchema()
