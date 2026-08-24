import { PrismaClient } from "@prisma/client";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

let nativeDbClient;
async function getNativeDb() {
  if (!nativeDbClient) {
    const mongoUri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
    nativeDbClient = new MongoClient(mongoUri);
    await nativeDbClient.connect();
  }
  return nativeDbClient.db("ediskarte");
}

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query;

    if (userType === "client") {
      try {
        const client = await prisma.user.findUnique({
          where: { id: userId },
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
            verificationStatus: true,
          },
        });

        if (client) {
          return res.status(200).json({
            userType: "client",
            ...client,
          });
        }
      } catch (e) {
        console.warn("[getUserProfile] Prisma client lookup failed, falling back to Native DB:", e.message);
      }

      // Native DB Fallback for Client
      const db = await getNativeDb();
      let uObj; try { uObj = new ObjectId(userId); } catch (err) { uObj = userId; }
      const userDoc = await db.collection("users").findOne({ $or: [{ _id: uObj }, { id: userId }] });
      if (userDoc) {
        return res.status(200).json({
          userType: "client",
          id: userDoc._id.toString(),
          firstName: userDoc.firstName || "",
          middleName: userDoc.middleName || "",
          lastName: userDoc.lastName || "",
          suffixName: userDoc.suffixName || "",
          profileImage: userDoc.profileImage || null,
          emailAddress: userDoc.emailAddress || "",
          phoneNumber: userDoc.phoneNumber || "",
          barangay: userDoc.barangay || "",
          street: userDoc.street || "",
          houseNumber: userDoc.houseNumber || "",
          gender: userDoc.gender || "",
          birthday: userDoc.birthday || null,
          verificationStatus: userDoc.verificationStatus || "",
        });
      }
    }

    if (userType === "job-seeker") {
      try {
        const jobSeeker = await prisma.jobSeeker.findUnique({
          where: { userId },
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
                verificationStatus: true,
              },
            },
            achievement: true,
          },
        });

        if (jobSeeker) {
          const { user, ...jobSeekerData } = jobSeeker;
          return res.status(200).json({
            userType: "job-seeker",
            ...user,
            ...jobSeekerData,
          });
        }
      } catch (e) {
        console.warn("[getUserProfile] Prisma jobSeeker lookup failed, falling back to Native DB:", e.message);
      }

      // Native DB Fallback for JobSeeker
      const db = await getNativeDb();
      let uObj; try { uObj = new ObjectId(userId); } catch (err) { uObj = userId; }
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: uObj }, { _id: uObj }, { id: userId }]
      });

      if (seekerDoc) {
        let targetUserId = seekerDoc.userId || seekerDoc._id;
        let tObj; try { tObj = new ObjectId(targetUserId); } catch (err) { tObj = targetUserId; }
        let userDoc = await db.collection("users").findOne({
          $or: [{ _id: tObj }, { id: targetUserId.toString() }]
        });

        return res.status(200).json({
          userType: "job-seeker",
          id: userDoc ? userDoc._id.toString() : seekerDoc._id.toString(),
          jobSeekerId: seekerDoc._id.toString(),
          firstName: userDoc?.firstName || "",
          middleName: userDoc?.middleName || "",
          lastName: userDoc?.lastName || "",
          suffixName: userDoc?.suffixName || "",
          profileImage: userDoc?.profileImage || null,
          emailAddress: userDoc?.emailAddress || "",
          phoneNumber: userDoc?.phoneNumber || "",
          phoneVisibility: userDoc?.phoneVisibility || "public",
          barangay: userDoc?.barangay || "",
          street: userDoc?.street || "",
          houseNumber: userDoc?.houseNumber || "",
          gender: userDoc?.gender || "",
          birthday: userDoc?.birthday || null,
          verificationStatus: userDoc?.verificationStatus || "",
          availability: seekerDoc.availability ?? true,
          credentials: seekerDoc.credentials || [],
          hourlyRate: seekerDoc.hourlyRate || "0",
          rate: seekerDoc.rate || null,
          jobTags: seekerDoc.jobTags || [],
        });
      }

      // If no seekerDoc found, fallback to users collection so profile always loads
      let userDoc = await db.collection("users").findOne({
        $or: [{ _id: uObj }, { id: userId }]
      });

      if (userDoc) {
        return res.status(200).json({
          userType: "job-seeker",
          id: userDoc._id.toString(),
          jobSeekerId: userDoc._id.toString(),
          firstName: userDoc.firstName || "",
          middleName: userDoc.middleName || "",
          lastName: userDoc.lastName || "",
          suffixName: userDoc.suffixName || "",
          profileImage: userDoc.profileImage || null,
          emailAddress: userDoc.emailAddress || "",
          phoneNumber: userDoc.phoneNumber || "",
          phoneVisibility: userDoc.phoneVisibility || "public",
          barangay: userDoc.barangay || "",
          street: userDoc.street || "",
          houseNumber: userDoc.houseNumber || "",
          gender: userDoc.gender || "",
          birthday: userDoc.birthday || null,
          verificationStatus: userDoc.verificationStatus || "pending",
          availability: true,
          credentials: [],
          hourlyRate: "0",
          rate: null,
          jobTags: [],
        });
      }
    }

    // Final fallback for any user in users collection
    const db = await getNativeDb();
    let uObj; try { uObj = new ObjectId(userId); } catch (err) { uObj = userId; }
    let anyUserDoc = await db.collection("users").findOne({
      $or: [{ _id: uObj }, { id: userId }]
    });
    if (anyUserDoc) {
      return res.status(200).json({
        userType: anyUserDoc.userType || "client",
        id: anyUserDoc._id.toString(),
        firstName: anyUserDoc.firstName || "",
        middleName: anyUserDoc.middleName || "",
        lastName: anyUserDoc.lastName || "",
        suffixName: anyUserDoc.suffixName || "",
        profileImage: anyUserDoc.profileImage || null,
        emailAddress: anyUserDoc.emailAddress || "",
        phoneNumber: anyUserDoc.phoneNumber || "",
        barangay: anyUserDoc.barangay || "",
        street: anyUserDoc.street || "",
        houseNumber: anyUserDoc.houseNumber || "",
        gender: anyUserDoc.gender || "",
        birthday: anyUserDoc.birthday || null,
        verificationStatus: anyUserDoc.verificationStatus || "pending",
      });
    }

    return res.status(404).json({ message: "User profile not found" });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    if (!userType) {
      return res.status(400).json({ message: "User type is required" });
    }

    const db = await getNativeDb();
    let userIdObj;
    try {
      userIdObj = new ObjectId(userId);
    } catch (e) {
      userIdObj = userId;
    }

    const userUpdateFields = {
      firstName: req.body.firstName,
      middleName: req.body.middleName,
      lastName: req.body.lastName,
      emailAddress: req.body.emailAddress,
      suffixName: req.body.suffixName,
      gender: req.body.gender ? req.body.gender.toLowerCase() : undefined,
      birthday: req.body.birthday ? new Date(req.body.birthday) : undefined,
      phoneNumber: req.body.phoneNumber,
      phoneVisibility: req.body.phoneVisibility,
      barangay: req.body.barangay,
      street: req.body.street,
      houseNumber: req.body.houseNumber,
    };
    if (req.file) {
      userUpdateFields.profileImage = req.file.path;
    }
    // Remove undefined values
    Object.keys(userUpdateFields).forEach(key => userUpdateFields[key] === undefined && delete userUpdateFields[key]);

    if (userType === "client") {
      await db.collection("users").updateOne(
        { $or: [{ _id: userIdObj }, { id: userId }] },
        { $set: userUpdateFields }
      );

      const updatedUser = await db.collection("users").findOne({
        $or: [{ _id: userIdObj }, { id: userId }]
      });
      console.log("Updated Client Profile (User Data)", updatedUser);
      return res.status(200).json({ id: updatedUser._id.toString(), ...updatedUser });
    }

    if (userType === "job-seeker") {
      // Find jobseeker doc
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ _id: userIdObj }, { id: userId }, { userId: userIdObj }, { userId: userId }]
      });

      if (!seekerDoc) {
        return res.status(404).json({ message: "JobSeeker not found" });
      }

      // Update associated user
      let targetUserId = seekerDoc.userId || seekerDoc._id;
      let targetUserObj;
      try {
        targetUserObj = new ObjectId(targetUserId);
      } catch (e) {
        targetUserObj = targetUserId;
      }

      await db.collection("users").updateOne(
        { $or: [{ _id: targetUserObj }, { id: targetUserId.toString() }] },
        { $set: userUpdateFields }
      );

      // If rate is provided, update it in the jobseekers collection
      if (req.body.rate !== undefined) {
        const rateVal = req.body.rate === "" || req.body.rate === null ? null : parseFloat(req.body.rate);
        await db.collection("jobseekers").updateOne(
          { _id: seekerDoc._id },
          { $set: { rate: rateVal } }
        );
      }

      const updatedSeeker = await db.collection("jobseekers").findOne({ _id: seekerDoc._id });
      return res.status(200).json({ id: updatedSeeker._id.toString(), ...updatedSeeker });
    }

    return res.status(400).json({ message: "Invalid user type" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateJobTags = async (req, res) => {
  try {
    const { userId } = req.params;
    const { jobTags } = req.body;

    const db = await getNativeDb();
    let userIdObj;
    try {
      userIdObj = new ObjectId(userId);
    } catch (e) {
      userIdObj = userId;
    }

    let seekerDoc = await db.collection("jobseekers").findOne({
      $or: [{ _id: userIdObj }, { id: userId }, { userId: userIdObj }, { userId: userId }]
    });

    if (!seekerDoc) {
      return res.status(404).json({ message: "JobSeeker not found" });
    }

    await db.collection("jobseekers").updateOne(
      { _id: seekerDoc._id },
      { $set: { jobTags: Array.isArray(jobTags) ? jobTags : [] } }
    );

    const updatedJobSeeker = await db.collection("jobseekers").findOne({ _id: seekerDoc._id });
    console.log("Updated JobSeeker", updatedJobSeeker);
    return res.status(200).json({ id: updatedJobSeeker._id.toString(), ...updatedJobSeeker });
  } catch (error) {
    console.error("Error updating job tags:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getJobSeekerProfileByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.params.jobSeekerId;
    console.log(`[getJobSeekerProfileByUserId] Received request for User ID: ${userId}`);

    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "User ID is required" });
    }

    const db = await getNativeDb();
    let uObj; try { uObj = new ObjectId(userId); } catch (err) { uObj = userId; }

    // 1. Search in users collection first
    let userDoc = await db.collection("users").findOne({
      $or: [{ _id: uObj }, { id: userId }]
    });

    // 2. Search in jobseekers collection
    let seekerDoc = await db.collection("jobseekers").findOne({
      $or: [{ userId: userId }, { userId: uObj }, { _id: uObj }, { id: userId }]
    });

    if (!userDoc && seekerDoc) {
      let targetUserId = seekerDoc.userId || seekerDoc._id;
      let tObj; try { tObj = new ObjectId(targetUserId); } catch (err) { tObj = targetUserId; }
      userDoc = await db.collection("users").findOne({
        $or: [{ _id: tObj }, { id: targetUserId.toString() }]
      });
    }

    if (userDoc) {
      const isPhonePrivate = userDoc.phoneVisibility === "private";
      return res.status(200).json({
        jobSeekerId: seekerDoc ? seekerDoc._id.toString() : userDoc._id.toString(),
        availability: seekerDoc?.availability ?? true,
        credentials: seekerDoc?.credentials || [],
        hourlyRate: seekerDoc?.hourlyRate || "0",
        rate: seekerDoc?.rate || null,
        jobTags: seekerDoc?.jobTags || [],
        user: {
          id: userDoc._id.toString(),
          firstName: userDoc.firstName || "",
          middleName: userDoc.middleName || "",
          lastName: userDoc.lastName || "",
          suffixName: userDoc.suffixName || "",
          profileImage: userDoc.profileImage || null,
          emailAddress: userDoc.emailAddress || "",
          phoneNumber: isPhonePrivate ? "Private" : (userDoc.phoneNumber || ""),
          phoneVisibility: userDoc.phoneVisibility || "public",
          barangay: userDoc.barangay || "",
          street: userDoc.street || "",
          houseNumber: userDoc.houseNumber || "",
          gender: userDoc.gender || "",
          birthday: userDoc.birthday || null,
          bio: userDoc.bio || "",
          userType: userDoc.userType || "client",
          jobsDone: userDoc.jobsDone || 0,
          joinedAt: userDoc.joinedAt || null,
          verificationStatus: userDoc.verificationStatus || "",
        },
      });
    }

    return res.status(404).json({ message: "Profile not found" });
  } catch (error) {
    console.error("[getJobSeekerProfileByUserId] Error fetching profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadCredential = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Processing credential upload for userId:", userId);

    // Check if files are present
    if (!req.files || req.files.length === 0) {
      console.log("No files received in request");
      return res.status(400).json({ message: "No credential files uploaded" });
    }

    console.log(`Received ${req.files.length} files in memory`);

    // Find the JobSeeker first
    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId },
      select: { id: true, credentials: true },
    });

    if (!jobSeeker) {
      console.log(`JobSeeker not found for userId: ${userId}`);
      return res.status(404).json({ message: "JobSeeker not found" });
    }

    // Generate filenames and paths before writing to disk
    const uploadPath = "assets/profiles/";

    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });

    // Generate paths for each file
    const filePaths = req.files.map((file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename =
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
      return uploadPath + filename;
    });

    console.log("Generated file paths:", filePaths);

    // Update database FIRST, before writing files
    // Ensure credentials is properly initialized as an array
    const currentCredentials = Array.isArray(jobSeeker.credentials)
      ? jobSeeker.credentials
      : [];
    const newCredentials = [...currentCredentials, ...filePaths];

    console.log("Updating database with credential paths");
    const db = await getNativeDb();
    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }
    await db.collection("jobseekers").updateOne(
      { $or: [{ userId: userId }, { userId: userIdObj }] },
      { $set: { credentials: newCredentials } }
    );

    console.log("Database updated successfully");

    // Now that database is updated, write files to disk
    const writeFilePromises = req.files.map((file, index) => {
      return new Promise((resolve, reject) => {
        fs.writeFile(filePaths[index], file.buffer, (err) => {
          if (err) {
            console.error(`Error writing file ${filePaths[index]}:`, err);
            reject(err);
          } else {
            console.log(
              `File ${index + 1} written successfully to ${filePaths[index]}`
            );
            resolve();
          }
        });
      });
    });

    // Process all file writes - if server restarts during this, database is already updated
    Promise.all(writeFilePromises)
      .then(() => {
        console.log("All files written successfully");
      })
      .catch((err) => {
        console.error("Error writing some files:", err);
      });

    return res.status(200).json({
      message: "Credentials uploaded successfully",
      credentials: newCredentials,
    });
  } catch (error) {
    console.error("Error in uploadCredential:", error);

    // Prisma-specific error handling
    if (error.code === "P2025") {
      return res.status(404).json({ message: "JobSeeker record not found" });
    }

    if (error.code && error.code.startsWith("P")) {
      return res.status(500).json({
        message: "Database error",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const userId = req.params.userId;

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    let targetUserId = userId;

    if (!user) {
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { id: userId },
      });
      if (jobSeeker) {
        targetUserId = jobSeeker.userId;
        user = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const achievements = await prisma.achievement.findMany({
      where: { userId: targetUserId },
    });

    return res.status(200).json(achievements);
  } catch (error) {
    console.error("Error in getAchievements:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCredential = async (req, res) => {
  try {
    const { userId } = req.params;
    const { credentialPath } = req.body;

    if (!credentialPath) {
      return res.status(400).json({ message: "Credential path is required" });
    }

    const db = await getNativeDb();
    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }

    const seekerDoc = await db.collection("jobseekers").findOne({
      $or: [{ userId: userId }, { userId: userIdObj }, { _id: userIdObj }]
    });

    if (!seekerDoc) {
      return res.status(404).json({ message: "JobSeeker profile not found" });
    }

    const currentCredentials = Array.isArray(seekerDoc.credentials) ? seekerDoc.credentials : [];
    const updatedCredentials = currentCredentials.filter(c => c !== credentialPath);

    await db.collection("jobseekers").updateOne(
      { _id: seekerDoc._id },
      { $set: { credentials: updatedCredentials } }
    );

    // Optionally try to delete file from disk if present
    try {
      if (fs.existsSync(credentialPath)) {
        fs.unlinkSync(credentialPath);
      }
    } catch (e) {
      console.log("Could not delete credential file from disk:", e);
    }

    return res.status(200).json({
      message: "Credential removed successfully",
      credentials: updatedCredentials,
    });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
