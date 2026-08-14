import { PrismaClient } from "@prisma/client";
import { MongoClient, ObjectId } from "mongodb";

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

export const createPosting = async (req, res) => {
  try {
    const db = await getNativeDb();
    const postContent = req.body.postContent || "";
    let postImages = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      postImages = req.files.map((f) => f.path.replace(/\\/g, "/"));
    } else if (req.file) {
      postImages = [req.file.path.replace(/\\/g, "/")];
    }

    const postImage = postImages.length > 0 ? (postImages.length === 1 ? postImages[0] : postImages) : "";
    const likeCount = parseInt(req.body.likeCount) || 0;
    const commentCount = parseInt(req.body.commentCount) || 0;

    let clientIdObj = null;
    let seekerIdObj = null;

    if (req.body.client) {
      try { clientIdObj = new ObjectId(req.body.client); } catch (e) { clientIdObj = req.body.client; }
    } else if (req.body.jobSeeker) {
      let jobSeeker = await db.collection("jobseekers").findOne({
        $or: [{ userId: req.body.jobSeeker }, { userId: new ObjectId(req.body.jobSeeker) }, { _id: new ObjectId(req.body.jobSeeker) }]
      });
      if (jobSeeker) {
        seekerIdObj = jobSeeker._id;
      } else {
        try { seekerIdObj = new ObjectId(req.body.jobSeeker); } catch (e) { seekerIdObj = req.body.jobSeeker; }
      }
    }

    const doc = {
      clientId: clientIdObj,
      jobSeekerId: seekerIdObj,
      postContent,
      postImage,
      likeCount,
      commentCount,
      createdAt: new Date(),
    };

    const insertRes = await db.collection("post").insertOne(doc);
    const response = { id: insertRes.insertedId.toString(), _id: insertRes.insertedId.toString(), ...doc };

    console.log("Successfully made a community post!", response);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const editPosting = async (req, res) => {
  try {
    const { postId } = req.params;
    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    const updateFields = {
      postContent: req.body.postContent,
    };
    if (req.file) {
      updateFields.postImage = req.file.path;
    }

    await db.collection("post").updateOne({ _id: postIdObj }, { $set: updateFields });
    const updatedPost = await db.collection("post").findOne({ _id: postIdObj });

    res.status(200).json(updatedPost ? { id: updatedPost._id.toString(), ...updatedPost } : {});
  } catch (error) {
    console.error("Error editing post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePosting = async (req, res) => {
  try {
    const { postId } = req.params;
    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    await db.collection("post").deleteOne({ _id: postIdObj });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCommunityPostings = async (req, res) => {
  try {
    const db = await getNativeDb();
    const posts = await db.collection("post").find({}).sort({ createdAt: -1 }).toArray();

    const transformedPosts = await Promise.all(posts.map(async (post) => {
      let author = null;

      if (post.clientId) {
        let clientIdObj;
        try { clientIdObj = new ObjectId(post.clientId); } catch (e) { clientIdObj = post.clientId; }
        const clientUser = await db.collection("users").findOne({ _id: clientIdObj });
        if (clientUser) {
          author = {
            id: clientUser._id.toString(),
            name: `${clientUser.firstName || ""} ${clientUser.lastName || ""}`.trim(),
            profilePicture: clientUser.profileImage || null,
            userType: clientUser.userType || "client",
          };
        }
      } else if (post.jobSeekerId) {
        let seekerIdObj;
        try { seekerIdObj = new ObjectId(post.jobSeekerId); } catch (e) { seekerIdObj = post.jobSeekerId; }
        const jobSeeker = await db.collection("jobseekers").findOne({ _id: seekerIdObj });
        if (jobSeeker) {
          let userIdObj;
          try { userIdObj = new ObjectId(jobSeeker.userId); } catch (e) { userIdObj = jobSeeker.userId; }
          const seekerUser = await db.collection("users").findOne({ _id: userIdObj });
          if (seekerUser) {
            author = {
              id: seekerUser._id.toString(),
              name: `${seekerUser.firstName || ""} ${seekerUser.lastName || ""}`.trim(),
              profilePicture: seekerUser.profileImage || null,
              userType: seekerUser.userType || "job-seeker",
            };
          }
        }
      }

      if (!author) {
        author = {
          id: "unknown",
          name: "Unknown User",
          profilePicture: null,
          userType: "unknown",
        };
      }

      return {
        id: post._id.toString(),
        _id: post._id.toString(),
        clientId: post.clientId ? post.clientId.toString() : "",
        jobSeekerId: post.jobSeekerId ? post.jobSeekerId.toString() : "",
        postContent: post.postContent || "",
        postImage: post.postImage || "",
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        createdAt: post.createdAt || post._id.getTimestamp(),
        author,
      };
    }));

    res.status(200).json(transformedPosts);
  } catch (error) {
    console.error("Error fetching community postings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllPosts = getCommunityPostings;

export const getUsername = async (req, res) => {
  try {
    const { userId, ids } = req.query;
    const db = await getNativeDb();

    // If query has 'ids' parameter (batch request from client)
    if (ids) {
      let idList = [];
      if (Array.isArray(ids)) {
        idList = ids.map(item => item?.userId).filter(Boolean);
      } else if (typeof ids === "object") {
        idList = Object.values(ids).map(item => item?.userId).filter(Boolean);
      }

      // Convert to ObjectId array
      const objIds = idList.map(id => {
        try { return new ObjectId(id); } catch(e) { return null; }
      }).filter(Boolean);

      // Find all users
      const users = await db.collection("users").find({
        _id: { $in: objIds }
      }).toArray();

      // Construct dictionary map
      const resultMap = {};
      users.forEach(user => {
        resultMap[user._id.toString()] = {
          firstName: user.firstName || "",
          middleName: user.middleName || "",
          lastName: user.lastName || "",
          profileImage: user.profileImage || ""
        };
      });

      return res.status(200).json(resultMap);
    }

    // Otherwise, handle single userId request
    if (!userId) {
      return res.status(400).json({ message: "userId or ids query parameter is required" });
    }

    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }

    const user = await db.collection("users").findOne({
      $or: [{ _id: userIdObj }, { id: userId }]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ 
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      profileImage: user.profileImage || ""
    });
  } catch (error) {
    console.error("Error in getUsername:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const userHasLiked = async (req, res) => {
  try {
    const { postId, userId, userType } = req.body;
    if (!postId || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    let likeDoc = {
      postId: postIdObj,
      likedAt: new Date()
    };

    if (userType === "client") {
      try { likeDoc.clientId = new ObjectId(userId); } catch (e) { likeDoc.clientId = userId; }
    } else if (userType === "job-seeker") {
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: new ObjectId(userId) }, { _id: new ObjectId(userId) }]
      });
      if (!seekerDoc) {
        return res.status(404).json({ message: "JobSeeker not found for the provided userId" });
      }
      likeDoc.jobSeekerId = seekerDoc._id;
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const insertRes = await db.collection("likes").insertOne(likeDoc);
    await db.collection("post").updateOne({ _id: postIdObj }, { $inc: { likeCount: 1 } });

    const response = { id: insertRes.insertedId.toString(), _id: insertRes.insertedId.toString(), ...likeDoc };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in userHasLiked:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const checkIfLiked = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userType } = req.query;

    if (!postId || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    let query = { $or: [{ postId: postIdObj }, { postId: postId }] };

    if (userType === "client") {
      query.clientId = { $in: [userId, new ObjectId(userId)] };
    } else if (userType === "job-seeker") {
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: new ObjectId(userId) }, { _id: new ObjectId(userId) }]
      });
      if (seekerDoc) {
        query.jobSeekerId = seekerDoc._id;
      }
    }

    const response = await db.collection("likes").findOne(query);
    res.status(200).json(response ? { ...response, id: response._id.toString() } : { likedAt: null });
  } catch (error) {
    console.error("Error in checkIfLiked:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userUnliked = async (req, res) => {
  try {
    const { postId, userId, userType } = req.body;
    if (!postId || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    let query = { $or: [{ postId: postIdObj }, { postId: postId }] };

    if (userType === "client") {
      try { query.clientId = new ObjectId(userId); } catch (e) { query.clientId = userId; }
    } else if (userType === "job-seeker") {
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: new ObjectId(userId) }, { _id: new ObjectId(userId) }]
      });
      if (seekerDoc) {
        query.jobSeekerId = seekerDoc._id;
      }
    }

    const like = await db.collection("likes").findOne(query);
    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    await db.collection("likes").deleteOne({ _id: like._id });
    await db.collection("post").updateOne({ _id: postIdObj }, { $inc: { likeCount: -1 } });

    res.status(200).json({ id: like._id.toString(), ...like });
  } catch (error) {
    console.error("Error in userUnliked:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userCommented = async (req, res) => {
  try {
    const { postId, comment, userId, userType, parentCommentId } = req.body;
    if (!postId || !comment || !userId || !userType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    const postExists = await db.collection("post").findOne({ _id: postIdObj });
    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    let commentDoc = {
      postId: postIdObj,
      comment: comment.comment || comment,
      createdAt: new Date(),
    };

    if (parentCommentId) {
      try { commentDoc.parentCommentId = new ObjectId(parentCommentId); } catch (e) { commentDoc.parentCommentId = parentCommentId; }
    }

    if (userType === "client") {
      try { commentDoc.clientId = new ObjectId(userId); } catch (e) { commentDoc.clientId = userId; }
    } else if (userType === "job-seeker") {
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: new ObjectId(userId) }, { _id: new ObjectId(userId) }]
      });
      if (!seekerDoc) {
        return res.status(404).json({ message: "JobSeeker not found" });
      }
      commentDoc.jobSeekerId = seekerDoc._id;
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const insertRes = await db.collection("comments").insertOne(commentDoc);

    if (!parentCommentId) {
      await db.collection("post").updateOne({ _id: postIdObj }, { $inc: { commentCount: 1 } });
    }

    const response = { id: insertRes.insertedId.toString(), _id: insertRes.insertedId.toString(), ...commentDoc };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in userCommented:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    const comments = await db.collection("comments").find({
      postId: postIdObj,
      parentCommentId: null
    }).toArray();

    const transformedComments = await Promise.all(comments.map(async (comment) => {
      let author = null;
      if (comment.clientId) {
        const clientUser = await db.collection("users").findOne({ _id: comment.clientId });
        if (clientUser) {
          author = {
            id: clientUser._id.toString(),
            name: `${clientUser.firstName || ""} ${clientUser.lastName || ""}`.trim(),
            profilePicture: clientUser.profileImage || null,
            userType: clientUser.userType || "client",
          };
        }
      } else if (comment.jobSeekerId) {
        const jobSeeker = await db.collection("jobseekers").findOne({ _id: comment.jobSeekerId });
        if (jobSeeker) {
          let userIdObj;
          try { userIdObj = new ObjectId(jobSeeker.userId); } catch (e) { userIdObj = jobSeeker.userId; }
          const seekerUser = await db.collection("users").findOne({ _id: userIdObj });
          if (seekerUser) {
            author = {
              id: seekerUser._id.toString(),
              name: `${seekerUser.firstName || ""} ${seekerUser.lastName || ""}`.trim(),
              profilePicture: seekerUser.profileImage || null,
              userType: seekerUser.userType || "job-seeker",
            };
          }
        }
      }

      if (!author) {
        author = { id: "unknown", name: "Unknown User", profilePicture: null, userType: "unknown" };
      }

      const replies = await db.collection("comments").find({
        parentCommentId: comment._id
      }).toArray();

      const transformedReplies = await Promise.all(replies.map(async (reply) => {
        let replyAuthor = null;
        if (reply.clientId) {
          const clientUser = await db.collection("users").findOne({ _id: reply.clientId });
          if (clientUser) {
            replyAuthor = {
              id: clientUser._id.toString(),
              name: `${clientUser.firstName || ""} ${clientUser.lastName || ""}`.trim(),
              profilePicture: clientUser.profileImage || null,
              userType: clientUser.userType || "client",
            };
          }
        } else if (reply.jobSeekerId) {
          const jobSeeker = await db.collection("jobseekers").findOne({ _id: reply.jobSeekerId });
          if (jobSeeker) {
            let userIdObj;
            try { userIdObj = new ObjectId(jobSeeker.userId); } catch (e) { userIdObj = jobSeeker.userId; }
            const seekerUser = await db.collection("users").findOne({ _id: userIdObj });
            if (seekerUser) {
              replyAuthor = {
                id: seekerUser._id.toString(),
                name: `${seekerUser.firstName || ""} ${seekerUser.lastName || ""}`.trim(),
                profilePicture: seekerUser.profileImage || null,
                userType: seekerUser.userType || "job-seeker",
              };
            }
          }
        }

        if (!replyAuthor) {
          replyAuthor = { id: "unknown", name: "Unknown User", profilePicture: null, userType: "unknown" };
        }

        return {
          id: reply._id.toString(),
          _id: reply._id.toString(),
          comment: reply.comment || "",
          createdAt: reply.createdAt || reply._id.getTimestamp(),
          author: replyAuthor,
        };
      }));

      return {
        id: comment._id.toString(),
        _id: comment._id.toString(),
        comment: comment.comment || "",
        createdAt: comment.createdAt || comment._id.getTimestamp(),
        author,
        replies: transformedReplies,
      };
    }));

    res.status(200).json(transformedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getComments = getCommentsForPost;

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Invalid comment content. 'text' must be a string." });
    }

    const db = await getNativeDb();
    let commentIdObj;
    try { commentIdObj = new ObjectId(commentId); } catch (e) { commentIdObj = commentId; }

    await db.collection("comments").updateOne({ _id: commentIdObj }, { $set: { comment: text } });
    const updatedComment = await db.collection("comments").findOne({ _id: commentIdObj });

    if (!updatedComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    console.log("Successfully edited comment!", updatedComment);
    res.status(200).json({ id: updatedComment._id.toString(), ...updatedComment });
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const editComment = updateComment;

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const db = await getNativeDb();
    let commentIdObj;
    try { commentIdObj = new ObjectId(commentId); } catch (e) { commentIdObj = commentId; }

    const comment = await db.collection("comments").findOne({ _id: commentIdObj });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await db.collection("comments").deleteOne({ _id: commentIdObj });
    console.log("Successfully deleted comment!", comment);
    res.status(200).json({ id: comment._id.toString(), ...comment });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userLikedComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const db = await getNativeDb();
    let commentIdObj;
    try { commentIdObj = new ObjectId(commentId); } catch (e) { commentIdObj = commentId; }

    const comment = await db.collection("comments").findOne({ _id: commentIdObj });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }

    const existingLike = await db.collection("comment_likes").findOne({
      userId: userIdObj,
      commentId: commentIdObj,
    });

    if (existingLike) {
      return res.status(400).json({ message: "Comment already liked by this user." });
    }

    const insertRes = await db.collection("comment_likes").insertOne({
      userId: userIdObj,
      commentId: commentIdObj,
      createdAt: new Date(),
    });

    res.status(200).json({ message: "Comment liked successfully", id: insertRes.insertedId.toString() });
  } catch (error) {
    console.error("Error in userLikedComment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userUnlikedComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const db = await getNativeDb();
    let commentIdObj;
    try { commentIdObj = new ObjectId(commentId); } catch (e) { commentIdObj = commentId; }
    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }

    await db.collection("comment_likes").deleteOne({
      userId: userIdObj,
      commentId: commentIdObj,
    });

    res.status(200).json({ message: "Comment unliked successfully" });
  } catch (error) {
    console.error("Error in userUnlikedComment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const checkIfLikedComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const db = await getNativeDb();
    let commentIdObj;
    try { commentIdObj = new ObjectId(commentId); } catch (e) { commentIdObj = commentId; }
    let userIdObj;
    try { userIdObj = new ObjectId(userId); } catch (e) { userIdObj = userId; }

    const like = await db.collection("comment_likes").findOne({
      userId: userIdObj,
      commentId: commentIdObj,
    });

    res.status(200).json({ isLiked: !!like });
  } catch (error) {
    console.error("Error in checkIfLikedComment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const db = await getNativeDb();
    let postIdObj;
    try { postIdObj = new ObjectId(postId); } catch (e) { postIdObj = postId; }

    const post = await db.collection("post").findOne({ _id: postIdObj });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    let author = null;
    if (post.clientId) {
      const clientUser = await db.collection("users").findOne({ _id: post.clientId });
      if (clientUser) {
        author = {
          id: clientUser._id.toString(),
          name: `${clientUser.firstName || ""} ${clientUser.lastName || ""}`.trim(),
          profilePicture: clientUser.profileImage || null,
          userType: clientUser.userType || "client",
        };
      }
    } else if (post.jobSeekerId) {
      const jobSeeker = await db.collection("jobseekers").findOne({ _id: post.jobSeekerId });
      if (jobSeeker) {
        let userIdObj;
        try { userIdObj = new ObjectId(jobSeeker.userId); } catch (e) { userIdObj = jobSeeker.userId; }
        const seekerUser = await db.collection("users").findOne({ _id: userIdObj });
        if (seekerUser) {
          author = {
            id: seekerUser._id.toString(),
            name: `${seekerUser.firstName || ""} ${seekerUser.lastName || ""}`.trim(),
            profilePicture: seekerUser.profileImage || null,
            userType: seekerUser.userType || "job-seeker",
          };
        }
      }
    }

    if (!author) {
      author = { id: "unknown", name: "Unknown User", profilePicture: null, userType: "unknown" };
    }

    res.status(200).json({
      id: post._id.toString(),
      _id: post._id.toString(),
      clientId: post.clientId ? post.clientId.toString() : "",
      jobSeekerId: post.jobSeekerId ? post.jobSeekerId.toString() : "",
      postContent: post.postContent || "",
      postImage: post.postImage || "",
      likeCount: post.likeCount || 0,
      commentCount: post.commentCount || 0,
      createdAt: post.createdAt || post._id.getTimestamp(),
      author
    });
  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query;

    const db = await getNativeDb();
    let query = {};
    if (userType === "client") {
      query.clientId = { $in: [userId, new ObjectId(userId)] };
    } else if (userType === "job-seeker") {
      let seekerDoc = await db.collection("jobseekers").findOne({
        $or: [{ userId: userId }, { userId: new ObjectId(userId) }, { _id: new ObjectId(userId) }]
      });
      if (seekerDoc) {
        query.jobSeekerId = seekerDoc._id;
      }
    }

    const posts = await db.collection("post").find(query).sort({ createdAt: -1 }).toArray();

    const transformed = posts.map((post) => ({
      id: post._id.toString(),
      _id: post._id.toString(),
      clientId: post.clientId ? post.clientId.toString() : "",
      jobSeekerId: post.jobSeekerId ? post.jobSeekerId.toString() : "",
      postContent: post.postContent || "",
      postImage: post.postImage || "",
      likeCount: post.likeCount || 0,
      commentCount: post.commentCount || 0,
      createdAt: post.createdAt || post._id.getTimestamp(),
    }));

    res.status(200).json(transformed);
  } catch (error) {
    console.error("Error in getUserPosts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
