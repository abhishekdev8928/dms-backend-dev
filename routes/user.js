// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const User = require("../models/UserModel");

const router = express.Router();

// JWT secret (store in env variable in production)
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(400).json({ message: "Email does not exist" });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, userExist.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userExist._id, email: userExist.email, role: userExist.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      msg: "Login successful",
      email: userExist.email,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const userExist = await User.findOne({ email });
    console.log(userExist);
    if (!userExist) {
      return res.status(400).json({ message: "User does not exist" });
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit string" });
    }

    if (!userExist.authkey) {
      return res.status(400).json({ message: "Auth key is missing" });
    }

    const verified = speakeasy.totp.verify({
      secret: userExist.authkey,
      encoding: "base32",
      token: +otp,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ msg: "Invalid OTP" });
    }

    // Clear auth key after verification
    userExist.authkey = null;
    await userExist.save();

    // Generate final JWT token for session
    const token = jwt.sign({ id: userExist._id, email: userExist.email }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      msg: "OTP verified successfully",
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/auth/profile", async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user by ID from token
    const user = await User.findById(decoded.id).select(
      "-password -authkey -__v"
    ); // exclude sensitive fields

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("Profile fetch error:", err);
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports =  router;
