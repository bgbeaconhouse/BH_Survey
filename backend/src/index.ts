import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { cohortRouter } from "./routes/cohorts.js";
import { surveyRouter } from "./routes/survey.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { exportRouter } from "./routes/exportRouter.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/survey", surveyRouter);

app.use("/api/cohorts", requireAuth, cohortRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/export", requireAuth, exportRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});