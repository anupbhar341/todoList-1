import express from "express";
import { generateSummary, getSummaries } from "../controller/summary.controller.js";
import { verifyToken } from "../jwt/token.js";

const router = express.Router();

router.post("/generate", verifyToken, generateSummary);
router.get("/history", verifyToken, getSummaries);

export default router; 