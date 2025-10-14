require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

console.log("Testing Neon connection...");
console.log(
  "Using host:",
  process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]
);

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log("✅ SUCCESS: Connected to Neon database!");

    // Test a simple query
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log("✅ Database version:", result[0].version);
  } catch (error) {
    console.error("❌ FAILED: Cannot connect to Neon");
    console.error("Error:", error.message);
    console.error("Code:", error.code);

    if (error.code === "P1001") {
      console.log("💡 Tips:");
      console.log("1. Check if your Neon database is active");
      console.log("2. Check if your IP is allowed in Neon settings");
      console.log('3. Try without the pooler: remove "-pooler" from hostname');
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
