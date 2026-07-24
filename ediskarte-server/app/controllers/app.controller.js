import { PrismaClient } from "@prisma/client";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs/promises";

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

export const jobRequest = async (req, res) => {
  let assignedJobSeekerId = req.body.jobSeeker || null;
  const db = await getNativeDb();

  let clientIdObj = null;
  try {
    clientIdObj = req.body.client ? new ObjectId(req.body.client) : null;
  } catch (e) {
    clientIdObj = req.body.client;
  }

  let seekerIdObj = null;
  if (assignedJobSeekerId && assignedJobSeekerId.trim() !== "") {
    try {
      seekerIdObj = new ObjectId(assignedJobSeekerId);
    } catch (e) {
      seekerIdObj = assignedJobSeekerId;
    }
  }

  const doc = {
    clientId: clientIdObj,
    jobSeekerId: seekerIdObj,
    jobTitle: req.body.jobTitle,
    jobDescription: req.body.jobDescription,
    category: req.body.category,
    jobLocation: req.body.jobLocation,
    jobStatus: "open",
    budget: req.body.budget,
    jobDuration: req.body.jobDuration,
    jobImage: req.files ? req.files.map((file) => file.path) : [],
    applicantCount: 0,
    datePosted: new Date(),
    acceptedAt: new Date(),
    completedAt: new Date(),
    verifiedAt: new Date(),
  };

  const insertRes = await db.collection("jobrequest").insertOne(doc);
  const jobPost = { id: insertRes.insertedId.toString(), ...doc };
  console.log("Successfully posted the job request to MongoDB", jobPost);

  // --- Notification logic ---
  const jobCategory = req.body.category;

  // Find all jobseekers with matching jobTags
  let jobSeekerWhere = {
    jobTags: {
      has: jobCategory,
    },
  };
  // If a jobSeeker is assigned, exclude them from notifications
  if (assignedJobSeekerId) {
    jobSeekerWhere.id = { not: assignedJobSeekerId };
  }

  try {
    const matchingJobSeekers = await prisma.jobSeeker.findMany({
      where: jobSeekerWhere,
      select: { id: true, userId: true },
    });

    if (matchingJobSeekers && matchingJobSeekers.length > 0) {
      const notifications = matchingJobSeekers.map((jobSeeker) => ({
        clientId: clientIdObj,
        jobSeekerId: jobSeeker.id ? new ObjectId(jobSeeker.id) : null,
        notificationType: "job-match",
        notificationTitle: "New Job Available!",
        notificationMessage: `A new job matching your skills (${jobCategory}) has been posted.`,
        relatedIds: [jobPost.id],
        isRead: false,
        createdAt: new Date(),
      }));

      await db.collection("notifications").insertMany(notifications);
      console.log(`Notifications created for jobPost ${jobPost.id}`);
    }
  } catch (notifErr) {
    console.warn("Notification creation skipped/failed:", notifErr.message);
  }

  res.status(201).json(jobPost);
};

export const getClientListings = async (req, res) => {
  try {
    const db = await getNativeDb();
    let clientIdObj;
    try {
      clientIdObj = req.query.client ? new ObjectId(req.query.client) : null;
    } catch (e) {
      clientIdObj = req.query.client;
    }

    const docs = await db.collection("jobrequest").find({
      $or: [{ clientId: clientIdObj }, { clientId: req.query.client }]
    }).toArray();

    const response = docs.map((doc) => ({
      id: doc._id.toString(),
      _id: doc._id.toString(),
      clientId: doc.clientId ? doc.clientId.toString() : "",
      jobSeekerId: doc.jobSeekerId ? doc.jobSeekerId.toString() : null,
      jobTitle: doc.jobTitle || "",
      jobDescription: doc.jobDescription || "",
      category: doc.category || "",
      jobLocation: doc.jobLocation || "",
      budget: doc.budget || "0",
      jobStatus: doc.jobStatus || "open",
      jobImage: doc.jobImage || [],
      applicantCount: doc.applicantCount || 0,
      datePosted: doc.datePosted || doc._id.getTimestamp(),
      acceptedAt: doc.acceptedAt || null,
      completedAt: doc.completedAt || null,
      verifiedAt: doc.verifiedAt || null,
    }));

    res.json(response);
  } catch (error) {
    console.error("Error fetching client listings:", error);
    res.status(500).json({ error: "Failed to fetch client listings" });
  }
};

export const getClientCompletedJobs = async (req, res) => {
  try {
    const clientId = req.params.client;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    const completedJobs = await prisma.jobRequest.findMany({
      where: {
        clientId: clientId,
        jobStatus: {
          in: ["completed", "reviewed"]
        }
      },
      include: {
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        jobSeeker: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Transform the response to include average rating and format jobSeeker data
    const formattedJobs = completedJobs.map(job => ({
      ...job,
      jobSeeker: job.jobSeeker ? {
        id: job.jobSeeker.id,
        firstName: job.jobSeeker.user.firstName,
        lastName: job.jobSeeker.user.lastName,
        profileImage: job.jobSeeker.user.profileImage
      } : null,
      averageRating: job.reviews.length > 0 
        ? job.reviews.reduce((acc, review) => acc + review.rating, 0) / job.reviews.length 
        : 0
    }));
    console.log(formattedJobs);
    res.json(formattedJobs);
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    res.status(500).json({ error: "Failed to fetch completed jobs" });
  }
};

export const getSingleJobListing = async (req, res) => {
  try {
    const db = await getNativeDb();
    let jobIdObj;
    try {
      jobIdObj = new ObjectId(req.query.jobID);
    } catch (e) {
      jobIdObj = req.query.jobID;
    }

    const doc = await db.collection("jobrequest").findOne({
      $or: [{ _id: jobIdObj }, { id: req.query.jobID }]
    });

    if (!doc) {
      return res.status(404).json({ error: "Job not found" });
    }

    const response = {
      id: doc._id.toString(),
      _id: doc._id.toString(),
      clientId: doc.clientId ? doc.clientId.toString() : "",
      jobSeekerId: doc.jobSeekerId ? doc.jobSeekerId.toString() : null,
      jobTitle: doc.jobTitle || "",
      jobDescription: doc.jobDescription || "",
      category: doc.category || "",
      jobLocation: doc.jobLocation || "",
      budget: doc.budget || "0",
      jobStatus: doc.jobStatus || "open",
      jobImage: doc.jobImage || [],
      applicantCount: doc.applicantCount || 0,
      datePosted: doc.datePosted || doc._id.getTimestamp(),
      acceptedAt: doc.acceptedAt || null,
      completedAt: doc.completedAt || null,
      verifiedAt: doc.verifiedAt || null,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching single job listing:", error);
    res.status(500).json({ error: "Failed to fetch job listing" });
  }
};

export const deleteClientListings = async (req, res) => {
  const db = await getNativeDb();
  let jobIdObj;
  try {
    jobIdObj = new ObjectId(req.query.jobID);
  } catch (e) {
    jobIdObj = req.query.jobID;
  }

  const existingDoc = await db.collection("jobrequest").findOne({ _id: jobIdObj });
  if (existingDoc && existingDoc.jobImage && existingDoc.jobImage.length > 0) {
    const parseDir = existingDoc.jobImage[0].split("/");
    parseDir.pop();
    const finalParsing = parseDir.join("/");
    try {
      await fs.rm(finalParsing, { recursive: true });
    } catch (e) {}
  }

  await db.collection("jobrequest").deleteOne({ _id: jobIdObj });
  res.status(200).json(`Successfully deleted job ID ${req.query.jobID}`);
};

export const editClientListings = async (req, res) => {
  let final_images = [];
  const folderPath =
    req.files && req.files.length > 0 ? req.files[0].destination : "";

  if (req.body.jobImage) {
    if (Array.isArray(req.body.jobImage)) {
      req.body.jobImage.forEach((imgURI) => final_images.push(imgURI));
    } else {
      final_images.push(req.body.jobImage);
    }
  }

  if (req.files && req.files.length > 0) {
    req.files.map((file) => final_images.push(file.path));
  }

  if (folderPath) {
    try {
      const existingImages = await fs.readdir(folderPath);
      existingImages.forEach((existing_img) => {
        if (!final_images.map((x) => x.split("/").pop()).includes(existing_img)) {
          fs.unlink(`${folderPath}/${existing_img}`);
        }
      });
    } catch (e) {}
  }

  const db = await getNativeDb();
  const targetIdStr = req.params.id || req.body.id || req.body._id;
  let jobIdObj;
  try {
    jobIdObj = new ObjectId(targetIdStr);
  } catch (e) {
    jobIdObj = targetIdStr;
  }

  const jobDesc = req.body.jobDescription || req.body.description || "";

  const updateFields = {
    jobTitle: req.body.jobTitle || "",
    jobDescription: jobDesc,
    category: req.body.category || "",
    budget: req.body.budget || "0",
    jobDuration: req.body.jobDuration || "",
    jobLocation: req.body.jobLocation || "",
    jobImage: final_images,
  };

  await db.collection("jobrequest").updateOne(
    { $or: [{ _id: jobIdObj }, { id: targetIdStr }] },
    { $set: updateFields }
  );

  const updatedDoc = await db.collection("jobrequest").findOne({
    $or: [{ _id: jobIdObj }, { id: targetIdStr }]
  });

  const response = updatedDoc
    ? { id: updatedDoc._id.toString(), _id: updatedDoc._id.toString(), ...updatedDoc }
    : { id: targetIdStr, _id: targetIdStr, ...updateFields };

  console.log("Successfully Edited Job Request!", response);
  res.status(200).json(response);
};

export const getJobRequests = async (req, res) => {
  try {
    const db = await getNativeDb();
    const docs = await db.collection("jobrequest").find({ jobStatus: "open" }).toArray();

    const jobRequests = await Promise.all(docs.map(async (doc) => {
      let clientObj = null;
      if (doc.clientId) {
        try {
          const clientUser = await db.collection("users").findOne({
            $or: [
              { _id: typeof doc.clientId === "string" ? new ObjectId(doc.clientId) : doc.clientId },
              { _id: doc.clientId.toString() }
            ]
          });
          if (clientUser) {
            clientObj = {
              id: clientUser._id.toString(),
              firstName: clientUser.firstName || "",
              lastName: clientUser.lastName || "",
              emailAddress: clientUser.emailAddress || "",
              profileImage: clientUser.profileImage || null,
            };
          }
        } catch (e) {}
      }

      return {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        clientId: doc.clientId ? doc.clientId.toString() : "",
        jobSeekerId: doc.jobSeekerId ? doc.jobSeekerId.toString() : null,
        jobTitle: doc.jobTitle || "",
        jobDescription: doc.jobDescription || "",
        category: doc.category || "",
        jobLocation: doc.jobLocation || "",
        budget: doc.budget || "0",
        jobStatus: doc.jobStatus || "open",
        jobImage: doc.jobImage || [],
        applicantCount: doc.applicantCount || 0,
        datePosted: doc.datePosted || doc._id.getTimestamp(),
        client: clientObj,
      };
    }));

    res.json(jobRequests);
  } catch (error) {
    console.error("Error fetching job requests:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getJobSeekerTags = async (req, res) => {
  try {
    const jobSeekerId = req.user.id; // Adjust based on your auth setup

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId: jobSeekerId },
      select: {
        jobTags: true,
      },
    });

    if (!jobSeeker) {
      return res.status(404).json({ error: "Job seeker not found" });
    }

    res.json({ jobTags: jobSeeker.jobTags || [] });
  } catch (error) {
    console.error("Error fetching job seeker tags:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    // Resolve the JobSeeker.id associated with this User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { jobSeeker: true }
    });

    const jobSeekerId = user?.jobSeeker?.id;

    if (!jobSeekerId) {
      return res.json([]); // Return empty if not a job seeker or has no seeker profile
    }

    const myJobs = await prisma.jobRequest.findMany({
      where: {
        jobSeekerId: jobSeekerId,
        jobStatus: {
          in: ["accepted", "pending", "completed", "reviewed"], // Only show accepted/pending/completed/reviewed jobs
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: {
        datePosted: "desc",
      },
    });
    res.json(myJobs);

  } catch (error) {
    console.error("Error fetching job seeker's jobs:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const markJobAsCompleted = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Resolve the JobSeeker.id associated with this User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { jobSeeker: true }
    });

    const jobSeekerId = user?.jobSeeker?.id;

    if (!jobSeekerId) {
      return res.status(404).json({ error: "Job seeker profile not found" });
    }

    // Verify job exists and belongs to this job seeker
    const job = await prisma.jobRequest.findFirst({
      where: {
        id: jobId,
        jobSeekerId: jobSeekerId,
      },
    });

    if (!job) {
      return res
        .status(404)
        .json({ error: "Job not found or not assigned to you" });
    }

    // Update job status
    const db = await getNativeDb();
    let jobIdObj;
    try {
      jobIdObj = new ObjectId(jobId);
    } catch (e) {
      jobIdObj = jobId;
    }
    await db.collection("jobrequest").updateOne(
      { _id: jobIdObj },
      { $set: { jobStatus: "completed", completedAt: new Date() } }
    );
    const updatedJob = await db.collection("jobrequest").findOne({ _id: jobIdObj });

    res.json(updatedJob);
  } catch (error) {
    console.error("Error marking job as completed:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const reviewnRating = async (req, res) => {
  const jobId = req.params.id; // Changed from id to jobId for clarity
  const { rating, feedback, reviewerId, reviewedId, userType } = req.body;
  console.log(req.body);
  console.log(
    "jobId:",
    jobId,
    "reviewerId:",
    reviewerId,
    "reviewedId:",
    reviewedId,
    "rating:",
    rating,
    "review",
    feedback
  );

  // Validation
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "Valid rating (1-5) is required.",
    });
  }
  if (!reviewedId) {
    return res.status(400).json({
      message: "reviewedId (reviewee) is required.",
    });
  }

  try {
    // 1. Verify job exists and is complete
    const job = await prisma.jobRequest.findUnique({
      where: { id: jobId },
      select: {
        jobStatus: true,
        clientId: true,
        jobSeekerId: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    // 2. Check if reviewer is a participant
    let reviewerJobSeekerId = null;
    const reviewerJobSeeker = await prisma.jobSeeker.findUnique({
      where: { userId: reviewerId }
    });
    if (reviewerJobSeeker) {
      reviewerJobSeekerId = reviewerJobSeeker.id;
    }

    const isValidReviewer =
      reviewerId === job.clientId ||
      reviewerId === job.jobSeekerId ||
      reviewerJobSeekerId === job.jobSeekerId;

    if (!isValidReviewer) {
      return res.status(403).json({
        message: "Only job participants can leave reviews.",
      });
    }

    // 3. Create review
    const review = await prisma.review.create({
      data: {
        jobRequestId: jobId,
        reviewerId,
        reviewedId,
        rating,
        feedback,
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            profileImage: true,
          },
        },
      },
    });

    // --- Increment jobsDone for the reviewee ---
    let userToIncrementId = reviewedId;
    const js = await prisma.jobSeeker.findUnique({
      where: { id: reviewedId }
    });
    if (js) {
      userToIncrementId = js.userId;
    }

    await prisma.user.update({
      where: { id: userToIncrementId },
      data: {
        jobsDone: { increment: 1 },
      },
    });

    // --- Create notification for review ---
    await prisma.notification.create({
      data: {
        clientId: userType === "client" ? reviewerId : job.clientId,
        jobSeekerId: userType === "job-seeker" ? reviewerId : reviewedId,
        notificationType:
          userType === "client" ? "review-jobseeker" : "review-client",
        notificationTitle: "You received a new review!",
        notificationMessage: `You have received a new review from ${review.reviewer.firstName}.`,
        relatedIds: [jobId],
        isRead: false,
        createdAt: new Date(),
      },
    });
    // --- End notification logic ---

    // 4. Update job status (optional)
    const db = await getNativeDb();
    let jobIdObj;
    try {
      jobIdObj = new ObjectId(jobId);
    } catch (e) {
      jobIdObj = jobId;
    }
    const newStatus =
      userType === "client"
        ? "completed"
        : userType === "job-seeker"
        ? "reviewed"
        : undefined;

    const setFields = { verifiedAt: new Date() };
    if (newStatus) setFields.jobStatus = newStatus;

    await db.collection("jobrequest").updateOne({ _id: jobIdObj }, { $set: setFields });

    res.status(201).json({
      message: "Review submitted successfully.",
      review,
    });
  } catch (error) {
    console.error("Review submission error:", error);
    res.status(500).json({
      message: "Failed to submit review.",
      error: error.message,
    });
  }
};

export const searchJobs = async (req, res) => {
  try {
    const { searchQuery, filter } = req.query;

    // Build the where clause for Prisma
    let whereClause = {
      jobStatus: "open", // Only show open jobs
    };

    // Add text search if searchQuery exists
    if (searchQuery) {
      whereClause.OR = [
        { jobTitle: { contains: searchQuery, mode: "insensitive" } },
        { jobDescription: { contains: searchQuery, mode: "insensitive" } },
        { category: { contains: searchQuery, mode: "insensitive" } },
        {
          client: {
            OR: [
              { firstName: { contains: searchQuery, mode: "insensitive" } },
              { lastName: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Add category filter if it exists and is not 'all'
    if (filter && filter !== "all") {
      whereClause.category = filter;
    }

    // Fetch jobs with client information
    const jobs = await prisma.jobRequest.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        datePosted: "desc",
      },
    });

    // Transform the response to include formatted client information
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      category: job.category,
      jobLocation: job.jobLocation,
      budget: job.budget,
      jobDuration: job.jobDuration,
      jobImage: job.jobImage,
      datePosted: job.datePosted,
      client: {
        id: job.client.id,
        name: `${job.client.firstName} ${job.client.lastName}`,
        profileImage: job.client.profileImage,
      },
    }));

    // Get available categories (for dynamic filter options)
    const categories = await prisma.jobRequest.findMany({
      where: { jobStatus: "open" },
      select: { category: true },
      distinct: ["category"],
    });

    res.json({
      jobs: formattedJobs,
      categories: categories.map((c) => c.category),
      total: formattedJobs.length,
    });
  } catch (error) {
    console.error("Error searching jobs:", error);
    res.status(500).json({
      error: "Failed to search jobs",
      details: error.message,
    });
  }
};

export const getTopCategories = async (req, res) => {
  try {
    // Get categories with their count, ordered by frequency
    const categoryStats = await prisma.jobRequest.groupBy({
      by: ["category"],
      _count: {
        category: true,
      },
      where: {
        // Optionally filter only open jobs
        jobStatus: "open",
      },
      orderBy: {
        _count: {
          category: "desc",
        },
      },
      take: 10, // Limit to top 10
    });

    // Transform the response to a simpler format
    const formattedCategories = categoryStats.map((stat) => ({
      category: stat.category,
      count: stat._count.category,
    }));

    res.json({
      categories: formattedCategories,
      total: formattedCategories.length,
    });
  } catch (error) {
    console.error("Error fetching top categories:", error);
    res.status(500).json({
      error: "Failed to fetch top categories",
      details: error.message,
    });
  }
};

export const searchJobSeekers = async (req, res) => {
  const { query, category, page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const whereClause = {
      userType: "job-seeker",
    };

    // Fetch ALL job seekers
    let allMatchingJobSeekers = await prisma.user.findMany({
      where: whereClause,
      include: {
        jobSeeker: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    let filteredJobSeekers = allMatchingJobSeekers;

    // Apply combined filtering in application code
    if (query || category) {
      const lowerCaseQuery = query?.toLowerCase();
      const lowerCaseCategory = category?.toLowerCase();

      filteredJobSeekers = allMatchingJobSeekers.filter((user) => {
        let queryMatch = !query; // Pass if no query is provided
        if (lowerCaseQuery) {
          const nameMatches =
            user.firstName?.toLowerCase().includes(lowerCaseQuery) ||
            user.middleName?.toLowerCase().includes(lowerCaseQuery) ||
            user.lastName?.toLowerCase().includes(lowerCaseQuery);

          const queryTagMatches = user.jobSeeker?.jobTags?.some((tag) =>
            tag.toLowerCase().includes(lowerCaseQuery)
          ); // Use includes() for partial match

          queryMatch = nameMatches || queryTagMatches; // Must match name OR query-as-tag
        }

        let categoryMatch = !category; // Pass if no category filter is provided
        if (lowerCaseCategory) {
          categoryMatch = user.jobSeeker?.jobTags?.some((tag) =>
            tag.toLowerCase().includes(lowerCaseCategory)
          ); // Use includes() for partial match
        }

        return queryMatch && categoryMatch; // Must satisfy both applicable conditions
      });
    }

    // Format results to match the frontend expectations
    const formattedJobSeekers = filteredJobSeekers.map((user) => {
      // Since we don't have access to reviews directly, we'll set a default rating for now
      // In a real implementation, you'd want to query reviews separately if needed
      let rating = null;

      // Get primary category (first tag) if available
      const category =
        user.jobSeeker?.jobTags?.length > 0
          ? user.jobSeeker.jobTags[0]
          : "General";

      return {
        id: user.id,
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        profileImage: user.profileImage,
        category: category,
        rating: rating,
      };
    });

    // Manual Pagination on the formatted results
    const totalJobSeekers = formattedJobSeekers.length;
    const paginatedJobSeekers = formattedJobSeekers.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    // Get top categories for filters (count occurrences of each tag)
    const tagCounts = {};
    allMatchingJobSeekers.forEach((user) => {
      if (user.jobSeeker?.jobTags) {
        user.jobSeeker.jobTags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Convert to array, sort by count (descending), and limit to top 10
    const topCategories = Object.entries(tagCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      data: paginatedJobSeekers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalJobSeekers,
        totalPages: Math.ceil(totalJobSeekers / limitNum),
      },
      categories: topCategories,
    });
  } catch (error) {
    console.error("Error searching job seekers:", error);
    res.status(500).json({ error: "Failed to search job seekers" });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes authentication middleware sets req.user
    const userType = req.user.userType; // e.g., "client" or "job-seeker"
    console.log(userId, userType,userId);
    // Build the where clause based on user type
    let whereClause = {};
    if (userType === "client") {
      whereClause.clientId = userId;
    } else if (userType === "job-seeker") {
      // Find the jobSeekerId for this user

        whereClause.jobSeekerId = userId;

    } else {
      return res.status(400).json({ error: "Invalid user type." });
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    console.log(notifications);
    res.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // Build the where clause based on user type
    let whereClause = { isRead: false }; // Only update unread notifications

    if (userType === "client") {
      whereClause.clientId = userId;
    } else if (userType === "job-seeker") {
      // Find the jobSeekerId for this user
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (jobSeeker) {
        whereClause.jobSeekerId = jobSeeker.id;
      } else {
        return res.status(404).json({ error: "Job seeker profile not found." });
      }
    } else {
      return res.status(400).json({ error: "Invalid user type." });
    }

    // Update all matching notifications to be marked as read
    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true },
    });

    res.json({
      message: "Notifications marked as read successfully",
      count: result.count,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};

export const hasUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes authentication middleware sets req.user
    const userType = req.user.userType; // e.g., "client" or "job-seeker"

    // Build the where clause based on user type
    let whereClause = { isRead: false }; // Add condition for unread notifications

    if (userType === "client") {
      whereClause.clientId = userId;
    } else if (userType === "job-seeker") {
      // Find the jobSeekerId for this user
      const jobSeeker = await prisma.jobSeeker.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (jobSeeker) {
        whereClause.jobSeekerId = jobSeeker.id; // Using jobSeeker.id, not userId
      } else {
        return res.status(404).json({ error: "Job seeker profile not found." });
      }
    } else {
      return res.status(400).json({ error: "Invalid user type." });
    }

    // Count unread notifications - more efficient than fetching all records
    const count = await prisma.notification.count({
      where: whereClause,
    });

    // Return true if there's at least one unread notification, false otherwise
    res.json({ hasUnread: count > 0 });
  } catch (error) {
    console.error("Error checking unread notifications:", error);
    res.status(500).json({ error: "Failed to check unread notifications" });
  }
};

export const getJobRequestById = async (req, res) => {
  try {
    const { id } = req.params; // Get the job request ID from the URL parameter

    const jobRequest = await prisma.jobRequest.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!jobRequest) {
      return res.status(404).json({ error: "Job request not found" });
    }

    res.json(jobRequest);
  } catch (error) {
    console.error("Error fetching job request by id:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// // Optional: Add an endpoint to get recent searches if you want to persist them
// export const getRecentSearches = async (req, res) => {
//   try {
//     const userId = req.user.id; // Assuming you have user authentication

//     const recentSearches = await prisma.searchHistory.findMany({
//       where: {
//         userId: userId
//       },
//       orderBy: {
//         searchedAt: 'desc'
//       },
//       take: 5 // Limit to 5 recent searches
//     });

//     res.json(recentSearches);
//   } catch (error) {
//     console.error("Error fetching recent searches:", error);
//     res.status(500).json({ error: "Failed to fetch recent searches" });
//   }
// };

// // Optional: Add an endpoint to save recent searches
// export const saveRecentSearch = async (req, res) => {
//   try {
//     const userId = req.user.id; // Assuming you have user authentication
//     const { searchQuery } = req.body;

//     const search = await prisma.searchHistory.create({
//       data: {
//         userId: userId,
//         searchQuery: searchQuery,
//         searchedAt: new Date()
//       }
//     });

//     res.json(search);
//   } catch (error) {
//     console.error("Error saving search:", error);
//     res.status(500).json({ error: "Failed to save search" });
//   }
// };
