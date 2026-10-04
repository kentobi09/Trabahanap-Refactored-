import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";

async function seed() {
  console.log("Connecting to database at:", uri.replace(/:([^:@]+)@/, ":****@"));
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    console.log("Connected successfully to DB:", db.databaseName);

    // 1. Collections to reset
    const collectionsToClean = [
      "users",
      "jobseekers",
      "jobrequest",
      "post",
      "like",
      "comment",
      "comment_likes",
      "notification",
      "participants",
      "messages",
      "reviews",
      "achievements",
      "milestones",
      "report_validation",
      "final_report",
      "blocked_users",
      "applicants",
      "applicant_jobseeker",
      "admins"
    ];

    console.log("Cleaning old/dummy test data...");
    for (const col of collectionsToClean) {
      try {
        await db.collection(col).deleteMany({});
      } catch (err) {
        // collection might not exist yet, that's fine
      }
    }
    console.log("All old dummy test collections cleared!");

    // 2. Hash passwords
    const adminHashedPassword = await bcrypt.hash("adminpassword123", 10);
    const teamHashedPassword = await bcrypt.hash("eDiskarteDev2026!", 10);

    // 3. Create Super Admin
    await db.collection("admins").insertOne({
      full_name: "eDiskarte Administrator",
      email: "admin@ediskarte.com",
      password: adminHashedPassword,
      is_admin: true,
      createdAt: new Date(),
    });
    console.log("Created Super Admin: admin@ediskarte.com / adminpassword123");

    // 4. Create Official eDiskarte Team User
    const teamUserId = new ObjectId();
    const teamJobSeekerId = new ObjectId();

    const teamUser = {
      _id: teamUserId,
      firstName: "eDiskarte",
      lastName: "Team",
      middleName: "",
      suffixName: "",
      gender: "Other",
      birthday: new Date("2024-01-01T00:00:00.000Z"),
      age: 25,
      emailAddress: "team@ediskarte.com",
      password: teamHashedPassword,
      phoneNumber: "09000000000",
      phoneVisibility: "hidden",
      profileImage: null,
      bio: "Official eDiskarte Developer & Support Team. Empowering local communities with trusted talent and reliable services.",
      barangay: "Community Center",
      street: "Main Hub",
      houseNumber: "1",
      userType: "both",
      idValidationFrontImage: null,
      idValidationBackImage: null,
      idType: "Government Issued",
      jobsDone: 0,
      joinedAt: new Date(),
      verificationStatus: "verified",
      verifiedAt: new Date(),
      pushToken: null,
    };
    await db.collection("users").insertOne(teamUser);

    const teamJobSeeker = {
      _id: teamJobSeekerId,
      userId: teamUserId,
      availability: true,
      credentials: ["Verified eDiskarte Official Organization"],
      hourlyRate: "0",
      rate: 5.0,
      joinedAt: new Date(),
      jobTags: ["others"],
    };
    await db.collection("jobseekers").insertOne(teamJobSeeker);
    console.log("Created Official eDiskarte Team Account (ID: " + teamUserId.toString() + ")");

    // 5. Create Official Community Welcome Post
    const welcomePost = {
      _id: new ObjectId(),
      clientId: teamUserId.toString(),
      jobSeekerId: teamJobSeekerId.toString(),
      postContent: "Welcome to eDiskarte! 🚀 Connect with trusted local service providers and clients in your community. Find work, hire skilled talent, and grow together. Let us build a stronger community!",
      postImage: null,
      likeCount: 1,
      commentCount: 0,
      createdAt: new Date(),
    };
    await db.collection("post").insertOne(welcomePost);

    // Initial like from eDiskarte team
    await db.collection("like").insertOne({
      _id: new ObjectId(),
      postId: welcomePost._id.toString(),
      clientId: teamUserId.toString(),
      jobSeekerId: teamJobSeekerId.toString(),
      likedAt: new Date(),
    });
    console.log("Created Official Community Welcome Post!");

    console.log("\n==========================================");
    console.log("✅ PRODUCTION SEED COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    console.log("Admin Login: admin@ediskarte.com / adminpassword123");
    console.log("Official Post: Live on Community Feed");
    console.log("Dummy Jobs/Users/Chats: 0 (Completely Fresh)");
    console.log("==========================================\n");

  } catch (error) {
    console.error("Error running production seed:", error);
  } finally {
    await client.close();
  }
}

seed();
