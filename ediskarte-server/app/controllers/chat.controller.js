import { PrismaClient } from "@prisma/client";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Console } from "console";
import { sendPushNotification } from "./notification.controller.js";

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

export const createChat = async (req, res) => {
  try {
    const { clientId, jobId } = req.body;
    const jobSeekerId = req.user.id; // The job seeker (current user)
    const io = req.app.get("socketio");

    const db = await getNativeDb();
    let jobIdObj;
    try { jobIdObj = new ObjectId(jobId); } catch (e) { jobIdObj = jobId; }

    const job = await db.collection("jobrequest").findOne({ _id: jobIdObj });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    let chat = await prisma.chat.findFirst({
      where: {
        jobId: jobId,
        AND: [
          { participants: { some: { userId: clientId } } },
          { participants: { some: { jobSeekerId: jobSeekerId } } },
        ],
      },
      include: { participants: true },
    });

    if (!chat) {
      const chatDoc = {
        chatTitle: job.jobTitle || "Job Chat",
        chatStatus: "pending",
        jobId: jobIdObj,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };
      const chatRes = await db.collection("chats").insertOne(chatDoc);
      const chatIdStr = chatRes.insertedId.toString();

      let clientIdObj;
      try { clientIdObj = new ObjectId(clientId); } catch (e) { clientIdObj = clientId; }
      let seekerIdObj;
      try { seekerIdObj = new ObjectId(jobSeekerId); } catch (e) { seekerIdObj = jobSeekerId; }

      const clientPartDoc = {
        chatId: chatRes.insertedId,
        userId: clientIdObj,
        jobSeekerId: null,
        joinedAt: new Date(),
        deletedByClient: false,
        deletedByJobSeeker: false,
      };

      const seekerPartDoc = {
        chatId: chatRes.insertedId,
        userId: null,
        jobSeekerId: seekerIdObj,
        joinedAt: new Date(),
        deletedByClient: false,
        deletedByJobSeeker: false,
      };

      const partResClient = await db.collection("participants").insertOne(clientPartDoc);
      const partResSeeker = await db.collection("participants").insertOne(seekerPartDoc);

      const participants = [
        { id: partResClient.insertedId.toString(), ...clientPartDoc, chatId: chatIdStr, userId: clientId, jobSeekerId: null },
        { id: partResSeeker.insertedId.toString(), ...seekerPartDoc, chatId: chatIdStr, userId: null, jobSeekerId: jobSeekerId }
      ];

      chat = {
        id: chatIdStr,
        _id: chatIdStr,
        ...chatDoc,
        participants: participants
      };

      await db.collection("jobrequest").updateOne({ _id: jobIdObj }, { $inc: { applicantCount: 1 } });

      // After creating the chat
      io.to(`user_${clientId}`).to(`user_${jobSeekerId}`).emit("new_chat", {
        chatId: chat.id,
        chatTitle: chat.chatTitle,
        chatStatus: chat.chatStatus,
        jobId: jobId,
        participants: chat.participants,
      });

      // Also emit to update the chat list
      io.to(`user_${clientId}`).to(`user_${jobSeekerId}`).emit("chat_updated", {
        id: chat.id,
        lastMessage: "Chat created",
        lastMessageTime: new Date(),
      });

      try {
        await db.collection("notifications").insertOne({
          clientId: clientId,
          jobSeekerId: jobSeekerId,
          notificationType: "chat-request",
          notificationTitle: "New Chat Request",
          notificationMessage: `A job seeker has requested to chat about your job posting "${job.jobTitle}".`,
          relatedIds: [jobId],
          isRead: false,
          createdAt: new Date(),
        });
      } catch (e) {}

      // Get client's push token
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: { pushToken: true },
      });

      // Send push notification if token exists
      if (client?.pushToken) {
        await sendPushNotification(
          client.pushToken,
          "New Chat Request",
          `A job seeker has requested to chat about your job posting "${job.jobTitle}".`,
          {
            type: "chat-request",
            chatId: chat.id,
            jobId: jobId,
          }
        );
      }
    }

    res.json({
      chatId: chat.id,
      chatTitle: chat.chatTitle,
      chatStatus: chat.chatStatus,
      jobId: jobId,
      participants: chat.participants,
    });
    console.log("Chat Participants Added");
  } catch (error) {
    console.log("Error here");
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔍 Current User ID:", userId);

    // Check if user is a JobSeeker
    const userAsJobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId },
      include: { user: true },
    });

    const isJobSeeker = !!userAsJobSeeker; // Boolean to check if the user is a Job Seeker
    console.log("🔍 Is Job Seeker?", isJobSeeker);

    // Fetch all chats where the user is involved
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
            user: true, // Client data
            jobSeeker: {
              // Jobseeker data
              include: {
                user: true, // Jobseeker's user profile
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

    const transformedChats = chats
      .map((chat) => {
        // Verify the chat has exactly 2 participants
        if (chat.participants.length !== 2) {
          console.error(`Chat ${chat.id} has invalid participants count`);
          return null;
        }

        // Identify client and jobseeker
        const clientParticipant = chat.participants.find(
          (p) => p.userId && !p.jobSeekerId
        );
        const jobSeekerParticipant = chat.participants.find(
          (p) => p.jobSeekerId && !p.userId
        );

        if (!clientParticipant || !jobSeekerParticipant) {
          console.error(
            `Chat ${chat.id} is missing required participant types`
          );
          return null;
        }

        // Get the OTHER participant's details
        const otherParticipant =
          userId === clientParticipant.userId
            ? jobSeekerParticipant
            : clientParticipant;

        const participantName = otherParticipant.jobSeeker
          ? `${otherParticipant.jobSeeker.user.firstName} ${otherParticipant.jobSeeker.user.lastName}`
          : `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`;

        const profileImage = otherParticipant.jobSeeker
          ? otherParticipant.jobSeeker.user.profileImage
          : otherParticipant.user.profileImage;

        return {
          id: chat.id,
          participantName,
          profileImage,
          lastMessage: chat.messages[0]?.messageContent || null,
          lastMessageTime: chat.lastMessageAt,
          offer: chat.offer || null,
          offerStatus: chat.offerStatus || "none",
        };
      })
      .filter((chat) => chat !== null); // Remove invalid chats

    console.log(
      "🔍 Transformed Chats:",
      JSON.stringify(transformedChats, null, 2)
    );

    res.json(transformedChats);
  } catch (error) {
    console.error("🚨 Error fetching user chats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, messageContent } = req.body;
    const userId = req.user.id; // Authenticated user ID (Client OR Job Seeker's User ID)

    // 🔍 Check if the chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // 🔍 Find the sender as a participant
    const sender = chat.participants.find(
      (p) => p.userId === userId || p.jobSeekerId === userId
    );
    if (!sender) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this chat" });
    }

    // ✅ Store using native MongoDB to bypass transaction requirements
    const db = await getNativeDb();
    let chatIdObj;
    try { chatIdObj = new ObjectId(chatId); } catch (e) { chatIdObj = chatId; }
    let senderIdObj;
    try { senderIdObj = new ObjectId(userId); } catch (e) { senderIdObj = userId; }

    const messageDoc = {
      chatId: chatIdObj,
      senderId: senderIdObj,
      messageContent,
      messageType: "text",
      sentAt: new Date(),
      deletedBySender: "no",
      deletedByReceiver: "no"
    };

    const messageRes = await db.collection("messages").insertOne(messageDoc);

    // Update lastMessageAt on the chat
    await db.collection("chats").updateOne({ _id: chatIdObj }, { $set: { lastMessageAt: new Date() } });

    console.log(
      `✅ Message Sent! Sender ID: ${userId}, Content: ${messageContent}`
    );

    const newMessage = {
      id: messageRes.insertedId.toString(),
      ...messageDoc,
      chatId,
      senderId: userId,
      readBy: []
    };

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("🚨 Error sending message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { sentAt: "asc" },
          include: {
            readBy: true, // ✅ Include read status
          },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    return res.json(chat.messages);
  } catch (error) {
    console.error("🚨 Error fetching messages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/chats/:chatId/status
export const getStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id; // From JWT middleware

    // Verify user has access to this chat
    const participant = await prisma.participant.findFirst({
      where: {
        chatId,
        OR: [{ userId }, { jobSeeker: { userId } }],
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { chatStatus: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ status: chat.chatStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/chats/:chatId/approve
export const chatApprove = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const db = await getNativeDb();

    let chatIdObj;
    try { chatIdObj = new ObjectId(chatId); } catch (e) { chatIdObj = chatId; }

    await db.collection("chats").updateOne(
      { $or: [{ _id: chatIdObj }, { id: chatId }] },
      { $set: { chatStatus: "approved" } }
    );

    const chat = await db.collection("chats").findOne({
      $or: [{ _id: chatIdObj }, { id: chatId }]
    });

    let jobTitle = "";
    if (chat && chat.jobId) {
      let jobIdObj;
      try { jobIdObj = new ObjectId(chat.jobId); } catch (e) { jobIdObj = chat.jobId; }
      const jobRequest = await db.collection("jobrequest").findOne({ _id: jobIdObj });
      jobTitle = jobRequest?.jobTitle || "";
    }

    try {
      const participant = await db.collection("participants").findOne({ chatId });
      if (participant && participant.jobSeekerId) {
        await db.collection("notifications").insertOne({
          clientId: userId,
          jobSeekerId: participant.jobSeekerId.toString(),
          notificationType: "chat-approved",
          notificationTitle: "Chat Approved",
          notificationMessage: `Your chat request for the job "${jobTitle}" has been approved by the employer.`,
          relatedIds: [chatId],
          isRead: false,
          createdAt: new Date(),
        });
      }
    } catch (e) {}

    // Notify all participants via socket.io
    const io = req.app.get("socketio");
    if (io) {
      io.to(chatId).emit("chat_approved", { chatId, approvedBy: "Client" });
      io.to(chatId).emit("chat_approved", { status: "approved" });
    }
  } catch (error) {
    console.error(error);
  }
  res.json({ message: "Chat approved" });
};

// POST /api/chats/:chatId/reject
export const chatReject = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const db = await getNativeDb();

    let chatIdObj;
    try { chatIdObj = new ObjectId(chatId); } catch (e) { chatIdObj = chatId; }

    await db.collection("chats").updateOne(
      { $or: [{ _id: chatIdObj }, { id: chatId }] },
      { $set: { chatStatus: "rejected" } }
    );

    const chat = await db.collection("chats").findOne({
      $or: [{ _id: chatIdObj }, { id: chatId }]
    });

    let jobTitle = "";
    if (chat && chat.jobId) {
      let jobIdObj;
      try { jobIdObj = new ObjectId(chat.jobId); } catch (e) { jobIdObj = chat.jobId; }
      const jobRequest = await db.collection("jobrequest").findOne({ _id: jobIdObj });
      jobTitle = jobRequest?.jobTitle || "";
    }

    try {
      const participant = await db.collection("participants").findOne({ chatId });
      if (participant && participant.jobSeekerId) {
        await db.collection("notifications").insertOne({
          clientId: userId,
          jobSeekerId: participant.jobSeekerId.toString(),
          notificationType: "chat-rejected",
          notificationTitle: "Chat Rejected",
          notificationMessage: `Your chat request for the job "${jobTitle}" has been rejected by the employer.`,
          relatedIds: [chatId],
          isRead: false,
          createdAt: new Date(),
        });
      }
    } catch (e) {}

    const io = req.app.get("socketio");
    if (io) {
      io.to(chatId).emit("chat_rejected", { status: "rejected" });
    }
  } catch (error) {
    console.error(error);
  }
  res.json({ message: "Chat rejected" });
};

export const getReadStatus = async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.query;
  try {
    const readStatus = await prisma.readStatus.findFirst({
      where: {
        messageId: messageId,
        userId: userId, // Check for a specific user
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      status: readStatus ? readStatus.status : "Not Seen",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch read status" });
  }
};

export const getJobSeekerTags = async (req, res) => {
  try {
    const jobSeekerId = req.params.id; // Adjust based on your auth setup
    console.log("THe id is", jobSeekerId);

    let jobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId: jobSeekerId },
      select: {
        jobTags: true,
      },
    });

    if (!jobSeeker) {
      jobSeeker = await prisma.jobSeeker.findUnique({
        where: { id: jobSeekerId },
        select: {
          jobTags: true,
        },
      });
    }

    if (!jobSeeker) {
      return res.status(404).json({ error: "Job seeker not found" });
    }

    res.json({ jobTags: jobSeeker.jobTags || [] });
  } catch (error) {
    console.error("Error fetching job seeker tags:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || userId === "undefined" || userId.length !== 24) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Get the job seeker with all related data
    let jobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId },
      include: {
        user: {
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
            verificationStatus: true,
          },
        },
        achievement: {
          select: {
            id: true,
            achievementName: true,
            jobRequired: true,
          },
        },
        jobRequest: {
          where: {
            AND: [{ jobStatus: "verified" }],
          },
          select: {
            completedAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!jobSeeker) {
      jobSeeker = await prisma.jobSeeker.findUnique({
        where: { id: userId },
        include: {
          user: {
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
              verificationStatus: true,
            },
          },
          achievement: {
            select: {
              id: true,
              achievementName: true,
              jobRequired: true,
            },
          },
          jobRequest: {
            where: {
              AND: [{ jobStatus: "verified" }],
            },
            select: {
              completedAt: true,
              verifiedAt: true,
            },
          },
        },
      });
    }

    if (!jobSeeker) {
      return res.status(404).json({ message: "Job seeker not found" });
    }

    // Fetch all reviews for this jobseeker (by jobRequest) using correct jobSeekerId
    const reviews = await prisma.review.findMany({
      where: {
        jobRequest: {
          jobSeekerId: jobSeeker.id,
          jobStatus: "verified",
        },
      },
      select: {
        id: true,
        rating: true,
        feedback: true,
        createdAt: true,
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        jobRequest: {
          select: {
            id: true,
            jobTitle: true,
            jobDescription: true,
            category: true,
            jobLocation: true,
            budget: true,
            jobImage: true,
            jobDuration: true,
            verifiedAt: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              }
            }
          },
        },
      },
    });

    // Calculate average rating and completed jobs
    const completedJobs = jobSeeker.jobRequest.length;
    const totalRating = reviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Transform achievements to match the interface
    const achievements = jobSeeker.achievement.map((achievement) => ({
      id: achievement.id,
      title: achievement.achievementName,
      description: `Complete ${achievement.jobRequired} jobs`,
      icon: achievement.achievementIcon,
      color: "#4CAF50", // Default color, can be customized
    }));

    // Transform feedbacks
    const feedbacks = reviews
      .filter((review) => review.feedback)
      .map((review) => ({
        id: review.id,
        rating: review.rating || 0,
        comment: review.feedback,
        date: (review.jobRequest?.verifiedAt || review.createdAt).toISOString(),
        jobTitle: review.jobRequest?.jobTitle || "",
        anonymousName: review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : "Anonymous Client",
        avatar: review.reviewer?.profileImage || "",
        jobRequest: review.jobRequest || null,
      }));

    // Calculate years of experience (assuming it's based on first job completion)
    const firstJobDate =
      jobSeeker.jobRequest.length > 0
        ? new Date(
            Math.min(...jobSeeker.jobRequest.map((job) => job.verifiedAt))
          )
        : new Date();
    const yearsExperience = Math.floor(
      (new Date() - firstJobDate) / (1000 * 60 * 60 * 24 * 365)
    );

    const isPhonePrivate = jobSeeker.user.phoneVisibility === "private";
    const response = {
      name: `${jobSeeker.user.firstName}  ${jobSeeker.user.middleName} ${jobSeeker.user.lastName}`,
      profileImage: jobSeeker.user.profileImage || "",
      address: `${jobSeeker.user.houseNumber || ""} ${jobSeeker.user.street}, ${
        jobSeeker.user.barangay
      }`,
      rating: averageRating,
      completedJobs,
      yearsExperience,
      skills: [], // We'll need to fetch job tags separately or modify the schema
      achievements,
      email: jobSeeker.user.emailAddress,
      phoneNumber: isPhonePrivate ? "Private" : (jobSeeker.user.phoneNumber || ""),
      gender: jobSeeker.user.gender,
      birthday: jobSeeker.user.birthday.toISOString(),
      feedbacks,
      jobsDone: jobSeeker.user.jobsDone || 0,
      joinedAt: jobSeeker.user.joinedAt
        ? jobSeeker.user.joinedAt.toISOString()
        : null,
      rate: jobSeeker.rate,
      hourlyRate: jobSeeker.hourlyRate,
      isVerified: jobSeeker.user.verificationStatus === "verified",
      credentials: jobSeeker.credentials || [],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getReviews = async (req, res) => {
  try {
    const userId = req.params.id;

    // Resolve the JobSeeker profile ID associated with this User ID
    let queryReviewedId = userId;
    const js = await prisma.jobSeeker.findUnique({
      where: { userId }
    });
    if (js) {
      queryReviewedId = js.id;
    }

    // Get all reviews for this job seeker (by reviewedId only)
    const reviews = await prisma.review.findMany({
      where: {
        reviewedId: queryReviewedId,
      },
      select: {
        id: true,
        rating: true,
        feedback: true,
        createdAt: true,
        reviewer: {
          // Add this to get reviewer information
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        jobRequest: {
          select: {
            id: true,
            jobTitle: true,
            jobDescription: true,
            category: true,
            jobLocation: true,
            budget: true,
            jobImage: true,
            jobDuration: true,
            verifiedAt: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              }
            }
          }
        }
      }

    });

    // Transform the reviews into feedback format
    const feedbacks = reviews
      .filter((review) => review.feedback)
      .map((review) => ({
        id: review.id,
        rating: review.rating || 0,
        comment: review.feedback,
        date: (review.jobRequest?.verifiedAt || review.createdAt).toISOString(),
        jobTitle: review.jobRequest?.jobTitle || "",
        anonymousName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
        avatar: review.reviewer.profileImage || "",
        jobRequest: review.jobRequest || null,
      }));

    return res.status(200).json(feedbacks);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getClientProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch the user (client) profile
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
        verificationStatus: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
      isVerified: user.verificationStatus === "verified",
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { blockedId, reason } = req.body;
    const blockerId = req.user.id;

    // Prevent self-blocking
    if (blockerId === blockedId) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    const db = await getNativeDb();

    // Check if already blocked
    const existingBlock = await db.collection("BlockedUser").findOne({
      blockerId,
      blockedId,
    });

    if (existingBlock) {
      return res.status(400).json({ message: "User is already blocked" });
    }

    // Create block
    const blockDoc = {
      blockerId,
      blockedId,
      reason: reason || null,
      blockedAt: new Date(),
    };

    await db.collection("BlockedUser").insertOne(blockDoc);

    res.status(201).json(blockDoc);
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { blockedId } = req.params;
    const blockerId = req.user.id;
    const db = await getNativeDb();

    await db.collection("BlockedUser").deleteOne({
      blockerId,
      blockedId,
    });

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const db = await getNativeDb();

    const blockedUsers = await db.collection("BlockedUser").find({ blockerId }).toArray();
    
    // For each blocked user, find the user details
    const result = [];
    for (const block of blockedUsers) {
      const user = await prisma.user.findUnique({
        where: { id: block.blockedId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        }
      });
      if (user) {
        result.push({
          id: block._id.toString(),
          blocked: user
        });
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isBlocked = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;

    if (!userId || userId === "undefined" || userId.length !== 24) {
      return res.status(200).json({ isBlocked: false });
    }

    const db = await getNativeDb();

    const block = await db.collection("BlockedUser").findOne({
      blockerId,
      blockedId: userId,
    });

    res.status(200).json({ isBlocked: !!block });
  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getJobRequestBudget = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get the job request with budget
    const jobRequest = await prisma.jobRequest.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        budget: true,
        jobTitle: true,
        jobStatus: true,
      },
    });

    if (!jobRequest) {
      return res.status(404).json({ message: "Job request not found" });
    }

    res.status(200).json({
      jobId: jobRequest.id,
      budget: jobRequest.budget,
      jobTitle: jobRequest.jobTitle,
      jobStatus: jobRequest.jobStatus,
    });
  } catch (error) {
    console.error("Error fetching job request budget:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUsersWhoBlockedMe = async (req, res) => {
  try {
    const userId = req.params.id;
    const db = await getNativeDb();

    const blockedByUsers = await db.collection("BlockedUser").find({ blockedId: userId }).toArray();

    // Extract just the blocker IDs from the results
    const blockerIds = blockedByUsers.map((block) => block.blockerId);

    res.status(200).json(blockerIds);
  } catch (error) {
    console.error("Error fetching users who blocked me:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reportValidation = async (req, res) => {
  try {
    console.log(req.body);
    const { reason, reportedObjectId, reporter } = req.body;
    const db = await getNativeDb();

    await db.collection("report_validation").insertOne({
      reason,
      reportedObjectId,
      reporter,
      status: "pending",
      dateReported: new Date(),
    });

    res.status(200).json({ message: "Report validated successfully" });
  } catch (error) {
    console.error("Error in reportValidation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAppliedStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id; // Job Seeker's User ID

    // Check if a chat exists for this jobId where one of the participants is this Job Seeker
    const chat = await prisma.chat.findFirst({
      where: {
        jobId,
        participants: {
          some: {
            jobSeekerId: userId,
          },
        },
      },
    });

    res.status(200).json({ hasApplied: !!chat });
  } catch (error) {
    console.error("Error checking applied status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
