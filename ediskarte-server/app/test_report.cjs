const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.reportValidation.create({
    data: {
      reason: "Test report reason",
      reportedObjectId: "6a62b6f2436d2c63a02d7baa",
      reporter: "6a61bddc9cd6ca65789aacb5",
    }
  });
  console.log("Report created:", result);
  await prisma.$disconnect();
}
run().catch(console.error);
