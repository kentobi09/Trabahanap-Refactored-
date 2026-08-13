import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const userId = "6a62b6f2436d2c63a02d7baa"; // The jobseeker's userId
    console.log("Querying chats for user:", userId);
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            OR: [
              { userId: userId },
              { jobSeekerId: userId }
            ]
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
            jobSeeker: {
              include: {
                user: true,
              },
            },
          },
        },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    });
    console.log("Found chats count:", chats.length);
    console.log("Chats JSON:", JSON.stringify(chats, null, 2));
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
