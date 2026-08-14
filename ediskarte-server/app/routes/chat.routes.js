import express from "express";
import {
  getClientProfile,
  getReviews,
  createChat,
  getUserChats,
  sendMessage,
  getMessages,
  getStatus,
  chatReject,
  chatApprove,
  getReadStatus,
  getJobSeekerTags,
  getUserProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
  isBlocked,
  getJobRequestBudget,
  getUsersWhoBlockedMe,
  reportValidation,
  checkAppliedStatus,
} from "../controllers/chat.controller.js";
import authenticateToken from "../middleware/auth.middleware.js";
import { storePushToken } from "../controllers/notification.controller.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = "assets/report_evidence/";
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "evidence-" + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

const router = express.Router();

router.get("/job/:jobId/check-applied", authenticateToken, checkAppliedStatus);

router.post("/api/chat/create", authenticateToken, createChat);
router.get("/api/chat", authenticateToken, getUserChats);
router.post("/api/messages/send", authenticateToken, sendMessage);
router.get("/api/messages/:chatId", authenticateToken, getMessages);
router.get("/chats/:chatId/status", authenticateToken, getStatus);
router.post("/chats/:chatId/approve", authenticateToken, chatApprove);
router.post("/chats/:chatId/reject", authenticateToken, chatReject);
router.get(
  "/api/message/read-status/:messageId",
  authenticateToken,
  getReadStatus
);
router.get("/api/job-seeker/:id/tags", authenticateToken, getJobSeekerTags);
router.get("/user/profile/:id/details", authenticateToken, getUserProfile);
router.get("/user/reviews/:id", authenticateToken, getReviews);
router.get("/api/clients/:id/profile", authenticateToken, getClientProfile);
router.post("/block", authenticateToken, blockUser);
router.delete("/block/:blockedId", authenticateToken, unblockUser);
router.get("/blocked", authenticateToken, getBlockedUsers);
router.get("/block/check/:userId", authenticateToken, isBlocked);
router.get("/job/:jobId/budget", authenticateToken, getJobRequestBudget);
router.post("/api/push-token", authenticateToken, storePushToken);
router.get("/users/:id/blocked-by", authenticateToken, getUsersWhoBlockedMe);
router.post("/api/report", authenticateToken, reportUpload.single("imageEvidence"), reportValidation);
export default router;
