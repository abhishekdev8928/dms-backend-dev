import express from "express";
import { register, login } from "../../controller/authController.js";

const router = express.Router();

// Register new user
router.post("/register", register);

// Login
router.post("/login", login);

export default router;
