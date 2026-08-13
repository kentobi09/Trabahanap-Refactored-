const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      emailAddress: true,
      phoneNumber: true,
      userType: true,
    }
  });
  console.log("=== USERS ===");
  console.log(users);
  await prisma.$disconnect();
}
run().catch(console.error);
