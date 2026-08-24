import express from "express";
import http from "http";
import "dotenv/config";
import appRouter from "./routes/app.routes.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { initializeSocketIO } from "./controllers/socket.io.controller.js";
import communityRoutes from "./routes/community.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

// Trust proxy for rate limiting behind Cloudflare or reverse proxies
app.set("trust proxy", 1);

// Global API Rate Limiter (600 requests per 1 minute per IP)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 600, // Limit each IP to 600 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: "Too many requests from this IP, please try again after a minute.",
  },
});

// Auth Rate Limiter for Auth / OTP / Sensitive endpoints (100 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 login/signup/OTP attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Apply global rate limiting to all requests
app.use(globalLimiter);

// Apply strict rate limiting to auth routes
app.use("/login", authLimiter);
app.use("/signup", authLimiter);
app.use("/store-otp", authLimiter);
app.use("/verify-otp", authLimiter);
app.use("/forgot-password", authLimiter);

app.use("/assets", express.static("assets"));
app.use(express.static("public"));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const httpServer = http.createServer(app);
const io = initializeSocketIO(httpServer);
app.set("socketio", io);

app.use(authRoutes);
app.use(appRouter);
app.use(chatRoutes);
app.use(communityRoutes);
app.use(profileRoutes);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

