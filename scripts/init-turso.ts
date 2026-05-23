import { createClient } from "@libsql/client"

const client = createClient({
  url: process.env.DATABASE_URL!,
})

const schema = `
DROP TABLE IF EXISTS Report;
DROP TABLE IF EXISTS TeamMemberCapacity;
DROP TABLE IF EXISTS Task;
DROP TABLE IF EXISTS Client;
DROP TABLE IF EXISTS FirmSettings;
DROP TABLE IF EXISTS Session;
DROP TABLE IF EXISTS Account;
DROP TABLE IF EXISTS VerificationToken;
DROP TABLE IF EXISTS User;

CREATE TABLE "User" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text,
  "email" text NOT NULL UNIQUE,
  "emailVerified" datetime,
  "image" text,
  "password" text,
  "role" text NOT NULL DEFAULT 'TEAM_MEMBER',
  "active" boolean NOT NULL DEFAULT 1,
  "jobTitle" text,
  "costRate" real,
  "capacityUnits" integer NOT NULL DEFAULT 120,
  "seniorityMultiplier" real NOT NULL DEFAULT 1.0,
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL
);

CREATE TABLE "Account" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE TABLE "Session" (
  "id" text NOT NULL PRIMARY KEY,
  "sessionToken" text NOT NULL UNIQUE,
  "userId" text NOT NULL,
  "expires" datetime NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE TABLE "VerificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires" datetime NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE TABLE "Client" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "subscriptionTier" text NOT NULL,
  "monthlyFee" real NOT NULL,
  "billingStartDate" datetime NOT NULL,
  "accountOwnerId" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "includedScope" text,
  "excludedScope" text,
  "monthlyEffortAllowance" integer,
  "notes" text,
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL,
  FOREIGN KEY ("accountOwnerId") REFERENCES "User" ("id") ON DELETE RESTRICT
);

CREATE TABLE "Task" (
  "id" text NOT NULL PRIMARY KEY,
  "clientId" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'NEW',
  "priority" text NOT NULL DEFAULT 'NORMAL',
  "category" text NOT NULL,
  "complexity" text NOT NULL DEFAULT 'MEDIUM',
  "effortScore" real NOT NULL DEFAULT 3.0,
  "seniorityMultiplier" real NOT NULL DEFAULT 1.0,
  "urgencyMultiplier" real NOT NULL DEFAULT 1.0,
  "weightedEffortUnits" real NOT NULL DEFAULT 3.0,
  "dueDate" datetime,
  "completedAt" datetime,
  "intakeSource" text NOT NULL DEFAULT 'MANUAL',
  "outOfScope" boolean NOT NULL DEFAULT 0,
  "internalNotes" text,
  "clientFacingSummary" text,
  "assignedToId" text,
  "reviewerId" text,
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE TABLE "FirmSettings" (
  "id" text NOT NULL PRIMARY KEY,
  "blendedCostPerUnit" real NOT NULL DEFAULT 50.0,
  "adminUpliftPercentage" real NOT NULL DEFAULT 10.0,
  "overheadPercentage" real NOT NULL DEFAULT 8.0,
  "defaultCurrency" text NOT NULL DEFAULT 'AUD',
  "firmName" text NOT NULL DEFAULT 'Legal Firm',
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL
);

CREATE TABLE "Report" (
  "id" text NOT NULL PRIMARY KEY,
  "clientId" text NOT NULL,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "reportTitle" text NOT NULL,
  "generatedById" text NOT NULL,
  "pdfPath" text,
  "reportDataJson" text,
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE RESTRICT
);

CREATE TABLE "TeamMemberCapacity" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "capacityUnits" integer NOT NULL DEFAULT 120,
  "costPerUnit" real,
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" datetime NOT NULL,
  UNIQUE ("userId", "month", "year"),
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
`

async function initSchema() {
  try {
    console.log("Initializing Turso schema...")
    const statements = schema.split(";").filter((s) => s.trim())

    for (const statement of statements) {
      const stmt = statement.trim()
      if (stmt) {
        await client.execute(stmt)
      }
    }

    console.log("✓ Schema initialized successfully!")
    await client.close()
  } catch (error) {
    console.error("✗ Error initializing schema:", error)
    await client.close()
    process.exit(1)
  }
}

initSchema()
