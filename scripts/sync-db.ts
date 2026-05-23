import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function syncDatabase() {
  try {
    console.log("Syncing database schema...");
    const { stdout } = await execAsync(
      "npx prisma db push --skip-generate",
      {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
        },
      }
    );
    console.log(stdout);
    console.log("✓ Database schema synced successfully");
  } catch (error) {
    console.error("Error syncing database:", error);
    process.exit(1);
  }
}

syncDatabase();
