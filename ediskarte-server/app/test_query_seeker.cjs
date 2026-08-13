const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { userType: "job-seeker" },
    include: { jobSeeker: true }
  });
  console.log("Users:", users.map(u => ({
    id: u.id,
    jobSeeker: u.jobSeeker ? { id: u.jobSeeker.id, userId: u.jobSeeker.userId } : null
  })));
  await prisma.$disconnect();
}
run().catch(console.error);
