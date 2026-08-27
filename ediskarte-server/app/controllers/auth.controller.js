import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { MongoClient, ObjectId, DBRef } from "mongodb";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();
dotenv.config();

let nativeDbClient;
async function getNativeDb() {
  if (!nativeDbClient) {
    const mongoUri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
    nativeDbClient = new MongoClient(mongoUri);
    await nativeDbClient.connect();
  }
  return nativeDbClient.db("ediskarte");
}

// Create in-memory OTP store
const otpStore = new Map();

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer configuration error:", error);
  } else {
    console.log("Nodemailer is ready to send messages");
  }
});

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim();
  const emailRegex = new RegExp(`^${cleanEmail}$`, "i");

  try {
    const db = await getNativeDb();
    console.log("Login check for email:", cleanEmail);
    
    // 1. Check Native MongoDB users collection
    const nativeUser = await db.collection("users").findOne({ emailAddress: emailRegex });
    console.log("nativeUser query result:", nativeUser ? nativeUser.emailAddress : "null");
    if (nativeUser) {
      if (nativeUser.accountStatus === "banned" || nativeUser.isBanned === true) {
        return res.status(403).json({
          error: "Account banned",
          message: "Account banned",
          accountStatus: "banned"
        });
      }
      if (nativeUser.accountStatus === "suspended" || nativeUser.isSuspended === true) {
        const now = new Date();
        if (!nativeUser.suspendedUntil || new Date(nativeUser.suspendedUntil) > now) {
          return res.status(403).json({
            error: "Account suspended",
            message: "Account suspended",
            accountStatus: "suspended",
            suspendedUntil: nativeUser.suspendedUntil || null
          });
        }
      }

      const passwordMatch = bcrypt.compareSync(String(password), nativeUser.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const userIdStr = nativeUser._id.toString();
      const token = jwt.sign(
        { id: userIdStr, email: nativeUser.emailAddress, userType: nativeUser.userType },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const userFormatted = {
        id: userIdStr,
        ...nativeUser,
      };
      delete userFormatted._id;
      delete userFormatted.password;

      return res.json({ message: "Login successful", token, user: userFormatted });
    }

    // 2. Check Native MongoDB applicants collection
    const nativeApplicant = await db.collection("applicants").findOne({ emailAddress: emailRegex });
    if (nativeApplicant) {
      const passwordMatch = bcrypt.compareSync(String(password), nativeApplicant.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const userId = new ObjectId();
      const achievementId = new ObjectId();

      const userData = {
        _id: userId,
        firstName: nativeApplicant.firstName || "",
        middleName: nativeApplicant.middleName || "",
        lastName: nativeApplicant.lastName || "",
        suffixName: nativeApplicant.suffixName || "",
        gender: nativeApplicant.gender || "unspecified",
        birthday: nativeApplicant.birthday || new Date("2000-01-01"),
        age: nativeApplicant.age || 0,
        emailAddress: nativeApplicant.emailAddress,
        password: nativeApplicant.password,
        profileImage: nativeApplicant.profileImage || "",
        idValidationFrontImage: nativeApplicant.idValidationFrontImage || "",
        idValidationBackImage: nativeApplicant.idValidationBackImage || "",
        idType: nativeApplicant.idType || "national_id",
        bio: nativeApplicant.bio || "",
        barangay: nativeApplicant.barangay || "N/A",
        street: nativeApplicant.street || "N/A",
        houseNumber: nativeApplicant.houseNumber || "",
        userType: nativeApplicant.userType || "job-seeker",
        jobsDone: 0,
        joinedAt: nativeApplicant.joinedAt || new Date(),
        verificationStatus: nativeApplicant.verificationStatus || "pending",
        accountStatus: "active",
      };

      if (nativeApplicant.userType === "job-seeker") {
        userData.achievements = [new DBRef("achievements", achievementId)];
      }

      await db.collection("users").insertOne(userData);

      if (nativeApplicant.userType === "job-seeker") {
        const applicantJobSeekerData = await db.collection("applicant_jobseeker").findOne({
          applicantId: nativeApplicant._id
        });

        const jobSeekerId = new ObjectId();
        const milestoneId = new ObjectId();

        await db.collection("jobseekers").insertOne({
          _id: jobSeekerId,
          userId: userId,
          availability: applicantJobSeekerData?.availability !== undefined ? applicantJobSeekerData.availability : true,
          hourlyRate: applicantJobSeekerData?.hourlyRate || "0",
          credentials: [],
          joinedAt: applicantJobSeekerData?.joinedAt || new Date(),
          jobTags: applicantJobSeekerData?.jobTags || [],
        });

        await db.collection("achievements").insertOne({
          _id: achievementId,
          jobSeekerId: jobSeekerId,
          userId: userId,
          achievementName: "Created First Account",
          jobRequired: "None",
          requiredJobCount: 0,
          achievementIcon: "./assets/achievements/starter.png",
          description: "Successfully created your first account",
          dateAchieved: new Date(),
        });

        await db.collection("milestones").insertOne({
          _id: milestoneId,
          jobSeekerId: jobSeekerId,
          milestoneTitle: "Start of the Journey",
          milestoneDescription: "Successfully created an account",
          jobsCompleted: 0,
          experienceLevel: "1",
          achievedAt: new Date(),
        });
      }

      const token = jwt.sign(
        { id: userId.toString(), email: userData.emailAddress, userType: userData.userType },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const userFormatted = {
        id: userId.toString(),
        ...userData,
      };
      delete userFormatted._id;
      delete userFormatted.password;

      return res.json({ message: "Login successful", token, user: userFormatted });
    }

    return res.status(401).json({ error: "User not found or pending verification" });
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ error: "Login failed due to a server error", details: err.message });
  }
};

export const signUp = async (req, res) => {
  if (req.body.userType === "job-seeker") {
    const user = await prisma.user.create({
      data: {
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        suffixName: req.body.suffixName,
        gender: req.body.gender,
        birthday: new Date(req.body.birthday),
        age: parseInt(req.body.age),
        emailAddress: req.body.emailAddress,
        password: bcrypt.hashSync(req.body.password, 10),
        profileImage: req.files ? req.files.profileImage[0].path : "",
        idValidationFrontImage: req.files
          ? req.files.idValidationFrontImage[0].path
          : "",
        idValidationBackImage: req.files
          ? req.files.idValidationBackImage[0].path
          : "",
        idType: req.body.idType,
        bio: req.body.bio,
        barangay: req.body.barangay,
        street: req.body.street,
        houseNumber: req.body.houseNumber,
        userType: req.body.userType,
        jobSeeker: {
          create: {
            availability: true,
            hourlyRate: "",
            jobTags: req.body.jobTags.split(","),
            achievement: {
              create: {
                achievementName: "Created First Account",
                jobRequired: "None",
                requiredJobCount: 0,
                achievementIcon: "./assets/achievements/starter.png",
              },
            },
            milestone: {
              create: {
                milestoneTitle: "Start of the Journey",
                milestoneDescription: "Successfully created an account",
                jobsCompleted: 0,
                experienceLevel: "1",
              },
            },
          },
        },
      },
      include: {
        jobSeeker: true,
      },
    });
    console.log("Successful Upload of Job Seeker!", user);
    res.json(user);
    return;
  }

  const user = await prisma.user.create({
    data: {
      firstName: req.body.firstName,
      middleName: req.body.middleName,
      lastName: req.body.lastName,
      suffixName: req.body.suffixName,
      gender: req.body.gender,
      age: parseInt(req.body.age),
      birthday: new Date(req.body.birthday),
      emailAddress: req.body.emailAddress,
      password: bcrypt.hashSync(req.body.password, 10),
      profileImage: req.files ? req.files.profileImage[0].path : "",
      idValidationFrontImage: req.files
        ? req.files.idValidationFrontImage[0].path
        : "",
      idValidationBackImage: req.files
        ? req.files.idValidationBackImage[0].path
        : "",
      idType: req.body.idType,
      bio: req.body.bio,
      barangay: req.body.barangay,
      street: req.body.street,
      houseNumber: req.body.houseNumber,
      userType: req.body.userType,
    },
  });
  console.log("Successful Upload of Client!", user);
  res.json(user);
};

export const decodeToken = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decodedToken.id || decodedToken.userId;

    let getTokenData = null;
    try {
      getTokenData = await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (e) {
      console.warn("[decodeToken] Prisma lookup failed:", e.message);
    }

    if (!getTokenData) {
      const db = await getNativeDb();
      let uObj; try { uObj = new ObjectId(userId); } catch (err) { uObj = userId; }
      const userDoc = await db.collection("users").findOne({
        $or: [{ _id: uObj }, { id: userId }]
      });
      if (userDoc) {
        getTokenData = {
          id: userDoc._id.toString(),
          ...userDoc,
        };
      }
    }

    if (getTokenData) {
      if (getTokenData._id && !getTokenData.id) {
        getTokenData.id = getTokenData._id.toString();
      }
      return res.json(getTokenData);
    }

    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.error("decodeToken error:", error);
    return res.status(401).send("Invalid or expired token");
  }
};

export const storeOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  console.log(`Received request to store OTP for ${email}`);

  try {
    // Generate 6-digit numeric OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    console.log(`Generated OTP: [${otp}] for ${email}`);

    // Hash the OTP
    const otpHash = await bcrypt.hash(otp, 10);
    console.log(`Generated hash for ${email}: [${otpHash}]`);

    // Set expiry for 10 minutes
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store in memory
    otpStore.set(email, { hash: otpHash, expires: otpExpires });
    console.log(
      `Stored temporary OTP hash for ${email}. Expires: ${otpExpires.toISOString()}`
    );

    // Send OTP via email using process.env.EMAIL_USER / EMAIL_PASS
    try {
      const mailOptions = {
        from: `"Trabahanap App" <${process.env.EMAIL_USER || "noreply@trabahanap.com"}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
      };
      await transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${email}`);
    } catch (mailErr) {
      console.warn(`Email sending notice for ${email}: ${mailErr.message}. OTP code is active: [${otp}]`);
    }

    res.status(200).json({
      message: "OTP sent to your email address. Please use it to continue.",
      otp: otp, // return otp for local fallback testing
    });
  } catch (error) {
    console.error(`Error in storeOTP for ${email}:`, error);
    otpStore.delete(email);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
};

export const verifyOtpOnly = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, error: "Email and OTP are required" });
  }

  // Convert OTP to string and trim whitespace
  const trimmedOtp = String(otp).trim();

  console.log(`Received verification request for ${email}`);
  console.log(`Raw OTP: [${otp}], type: ${typeof otp}`);
  console.log(`Trimmed OTP: [${trimmedOtp}], type: ${typeof trimmedOtp}`);

  try {
    const storedOtpData = otpStore.get(email);

    if (!storedOtpData) {
      console.log(`Verify attempt for ${email}: No temporary OTP found.`);
      return res.status(401).json({
        success: false,
        error: "Invalid or expired OTP request. Please request an OTP first.",
      });
    }

    console.log(
      `Found stored OTP data for ${email}. Hash: [${storedOtpData.hash}], Expires: ${storedOtpData.expires}`
    );

    if (new Date() > storedOtpData.expires) {
      console.log(`Verify attempt for ${email}: Temporary OTP expired.`);
      otpStore.delete(email);
      return res.status(401).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    // Use trimmed OTP for comparison
    console.log(`Comparing trimmed OTP [${trimmedOtp}] with stored hash`);
    const isMatch = await bcrypt.compare(trimmedOtp, storedOtpData.hash);
    console.log(`bcrypt.compare result: ${isMatch}`);

    if (!isMatch) {
      console.log(`Verify attempt for ${email}: Invalid OTP provided.`);
      return res
        .status(401)
        .json({ success: false, error: "Invalid OTP provided." });
    }

    console.log(`Temporary OTP verification successful for ${email}`);
    res.json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error(`Error during OTP-only verification for ${email}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP. Please try again.",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Email and new password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const db = await getNativeDb();

    // Check if user exists in users collection or applicants collection
    const user = await db.collection("users").findOne({ emailAddress: email });
    const applicant = await db.collection("applicants").findOne({ emailAddress: email });

    if (!user && !applicant) {
      const prismaUser = await prisma.user.findFirst({ where: { emailAddress: email } });
      if (!prismaUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found with this email address." });
      }
    }

    // Update native MongoDB users collection
    await db.collection("users").updateOne(
      { emailAddress: email },
      { $set: { password: hashedPassword } }
    );

    // Update native MongoDB applicants collection
    await db.collection("applicants").updateOne(
      { emailAddress: email },
      { $set: { password: hashedPassword } }
    );

    // Update Prisma User
    try {
      await prisma.user.updateMany({
        where: { emailAddress: email },
        data: { password: hashedPassword },
      });
    } catch (e) {}

    // Clear OTP
    otpStore.delete(email);

    console.log(`Password reset successful for ${email}`);
    return res.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error(`Error resetting password for ${email}:`, error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to reset password. Please try again." });
  }
};

export const verifyApplicant = async (req, res) => {
  try {
    console.log("verifyApplicant received body:", req.body);

    let birthdayDate = new Date("2000-01-01");
    if (req.body.birthday) {
      const parsed = new Date(req.body.birthday);
      if (!isNaN(parsed.getTime())) {
        birthdayDate = parsed;
      }
    }

    let parsedAge = 0;
    if (req.body.age) {
      const parsed = parseInt(req.body.age, 10);
      if (!isNaN(parsed)) {
        parsedAge = parsed;
      }
    }

    const rawPassword =
      req.body.password !== undefined &&
      req.body.password !== null &&
      req.body.password !== ""
        ? String(req.body.password)
        : "DefaultPass123!";
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);

    let profileImagePath = null;
    let frontImagePath = null;
    let backImagePath = null;

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (["profileImage", "profile_image", "avatar"].includes(file.fieldname)) {
          profileImagePath = file.path;
        } else if (["idValidationFrontImage", "frontImage", "idFront", "idValidationFront"].includes(file.fieldname)) {
          frontImagePath = file.path;
        } else if (["idValidationBackImage", "backImage", "idBack", "idValidationBack"].includes(file.fieldname)) {
          backImagePath = file.path;
        }
      }
    } else if (req.files) {
      if (req.files.profileImage) profileImagePath = req.files.profileImage[0]?.path || null;
      if (req.files.idValidationFrontImage) frontImagePath = req.files.idValidationFrontImage[0]?.path || null;
      if (req.files.idValidationBackImage) backImagePath = req.files.idValidationBackImage[0]?.path || null;
    }

    const applicantData = {
      firstName: req.body.firstName || "",
      middleName: req.body.middleName || "",
      lastName: req.body.lastName || "",
      suffixName: req.body.suffixName || "",
      gender: req.body.gender || "unspecified",
      birthday: birthdayDate,
      age: parsedAge,
      emailAddress: req.body.emailAddress || "",
      password: hashedPassword,
      phoneNumber: req.body.phoneNumber || null,
      profileImage: profileImagePath,
      idValidationFrontImage: frontImagePath,
      idValidationBackImage: backImagePath,
      idType: req.body.idType || "national_id",
      bio: req.body.bio || null,
      barangay: req.body.barangay || req.body.address?.barangay || "N/A",
      street: req.body.street || req.body.address?.street || "N/A",
      houseNumber: req.body.houseNumber || req.body.address?.houseNumber || null,
      userType: req.body.userType || "job-seeker",
      jobsDone: 0,
      joinedAt: new Date(),
      verificationStatus: "pending",
    };

    const db = await getNativeDb();
    const insertResult = await db.collection("applicants").insertOne(applicantData);
    const applicantId = insertResult.insertedId.toString();

    // If the user is a job-seeker, we need additional processing
    if (req.body.userType === "job-seeker") {
      const availability =
        req.body.availability !== undefined ? req.body.availability : true;
      const hourlyRate = req.body.hourlyRate || "0";
      const credentials = req.body.credentials || null;

      let jobTags = [];
      if (req.body.jobTags) {
        if (typeof req.body.jobTags === "string") {
          try {
            jobTags = JSON.parse(req.body.jobTags);
          } catch (e) {
            jobTags = req.body.jobTags.split(",").map((tag) => tag.trim());
          }
        } else if (Array.isArray(req.body.jobTags)) {
          jobTags = req.body.jobTags;
        }
      }

      await db.collection("applicant_jobseeker").insertOne({
        applicantId: insertResult.insertedId,
        joinedAt: new Date(),
        availability: availability,
        hourlyRate: hourlyRate,
        credentials: credentials,
        jobTags: Array.isArray(jobTags) && jobTags.length > 0 ? jobTags : [],
      });

      console.log(
        `Job-seeker applicant created successfully in MongoDB: ${applicantId}`
      );
    } else {
      console.log(
        `Client applicant created successfully in MongoDB: ${applicantId}`
      );
    }

    const { password: _, ...applicantWithoutPassword } = applicantData;

    return res.status(201).json({
      success: true,
      id: applicantId,
      message: "Applicant created successfully. Waiting for verification.",
      applicant: applicantWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating applicant:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create applicant",
      details: error.message,
    });
  }
};
