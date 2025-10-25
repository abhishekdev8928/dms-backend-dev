import createError from "http-errors";
import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * @desc    Login user and send OTP
 * @route   POST /auth/login
 * @body    { email, password } 
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError.BadRequest("Email and password are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw createError.Unauthorized("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw createError.Unauthorized("Invalid email or password");

    // Generate numeric email OTP
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    user.otp = otp;
    user.loginotpcount += 1;
    await user.save();

    // Send OTP to email
    await sendEmail(user.email, "Your OTP Code", `Your OTP is: ${otp}`);

    // ✅ Return email in response for frontend
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      data: {
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Verify OTP (auto-detect email or authenticator) and return JWT token
 * @route   POST /auth/verify-otp
 * @body    { email, otp }
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw createError.BadRequest("Email and OTP are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw createError.Unauthorized("User not found");

    let isValidOtp = false;

    // If user has an authenticator key, try verifying via authenticator
    if (user.authkey) {
      isValidOtp = speakeasy.totp.verify({
        secret: user.authkey,
        encoding: "base32",
        token: otp,
        window: 1,
      });
    }

    // If authenticator OTP failed or user has no authkey, check email OTP
    if (!isValidOtp) {
      isValidOtp = parseInt(otp) === user.otp;
    }

    if (!isValidOtp) {
      throw createError.Unauthorized("Invalid OTP");
    }

    // Clear OTP after verification
    if (user.otp) {
      user.otp = null;
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    const token = user.generateToken();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};



/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @body    { email, password, role }
 */
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError.BadRequest("Email, password, and role are required");
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw createError.Conflict("Email already registered");
    }

    // Generate TOTP authkey automatically
    const authkey = speakeasy.generateSecret({ length: 20 }).base32;

    // Create user
    const user = new UserModel({
      email,
      password,
      authkey,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        authkey, // optionally return to frontend for QR setup
      },
    });
  } catch (err) {
    next(err);
  }
};
