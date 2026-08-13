const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const userId = "6a61bddc9cd6ca65789aacb5"; // Ken Galapate ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
      jobsDone: true,
      joinedAt: true,
    },
  });

  console.log("Raw user object:", user);
  const isPhonePrivate = user.phoneVisibility === "private";
  const response = {
    name: `${user.firstName} ${user.middleName || ""} ${user.lastName}`,
    profileImage: user.profileImage || "",
    address: `${user.houseNumber || ""} ${user.street || ""}, ${
      user.barangay || ""
    }`,
    email: user.emailAddress,
    phoneNumber: isPhonePrivate ? "Private" : (user.phoneNumber || ""),
    gender: user.gender,
    birthday: user.birthday ? user.birthday.toISOString() : null,
    jobsDone: user.jobsDone || 0,
    joinedAt: user.joinedAt ? user.joinedAt.toISOString() : null,
  };

  console.log("Response Payload for Client:");
  console.log(JSON.stringify(response, null, 2));

  await prisma.$disconnect();
}
run().catch(console.error);
