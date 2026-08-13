const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const userId = "6a62b7be436d2c63a02d7bb7"; // Job Seeker ID (not User ID)
  let jobSeeker = await prisma.jobSeeker.findUnique({
    where: { userId: userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffixName: true,
          profileImage: true,
          emailAddress: true,
          phoneNumber: true,
          phoneVisibility: true,
          barangay: true,
          street: true,
          houseNumber: true,
          gender: true,
          birthday: true,
          bio: true,
          userType: true,
          jobsDone: true,
          joinedAt: true,
          verificationStatus: true,
        }
      }
    }
  });

  if (!jobSeeker) {
    jobSeeker = await prisma.jobSeeker.findUnique({
      where: { id: userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffixName: true,
            profileImage: true,
            emailAddress: true,
            phoneNumber: true,
            phoneVisibility: true,
            barangay: true,
            street: true,
            houseNumber: true,
            gender: true,
            birthday: true,
            bio: true,
            userType: true,
            jobsDone: true,
            joinedAt: true,
            verificationStatus: true,
          }
        }
      }
    });
  }

  const isPhonePrivate = jobSeeker?.user?.phoneVisibility === "private";
  const userCopy = jobSeeker?.user ? {
    ...jobSeeker.user,
    phoneNumber: isPhonePrivate ? "Private" : (jobSeeker.user.phoneNumber || ""),
  } : null;

  const allSeekers = await prisma.jobSeeker.findMany({
    include: {
      user: true
    }
  });
  console.log("All jobseekers:", JSON.stringify(allSeekers, null, 2));
  await prisma.$disconnect();
}
run().catch(console.error);
