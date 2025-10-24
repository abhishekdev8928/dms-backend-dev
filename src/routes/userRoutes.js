import express from "express";
import { register, login , verifyOtp } from "../controller/authController.js";

const router = express.Router();

// Register new user
router.post("/register", register);

// verify otp
router.post("/verify-otp", verifyOtp);

// Login
router.post("/login", login);

export default router;
