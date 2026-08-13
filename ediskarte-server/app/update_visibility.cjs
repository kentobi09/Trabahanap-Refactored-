const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.user.updateMany({
    data: {
      phoneVisibility: "public"
    }
  });
  console.log("Updated users count:", result.count);
  await prisma.$disconnect();
}
run().catch(console.error);
