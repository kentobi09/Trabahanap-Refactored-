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

const app = express();

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

