import createError from "http-errors";
import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * @desc    Login user and send OTP
 * @route   POST /auth/login
 * @body    { email, password, otpMethod } // otpMethod: "email" | "authenticator"
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, otpMethod } = req.body;

    if (!email || !password || !otpMethod) {
      throw createError.BadRequest("Email, password, and otpMethod are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw createError.Unauthorized("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw createError.Unauthorized("Invalid email or password");

    let otp;

    if (otpMethod === "authenticator") {
      if (!user.authkey) {
        throw createError.BadRequest("User has not set up Authenticator OTP");
      }
      // Just respond that user should provide TOTP from authenticator app
      return res.status(200).json({
        success: true,
        message: "Enter OTP from your authenticator app",
      });
    } else if (otpMethod === "email") {
      // Generate numeric email OTP
      otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
      user.otp = otp;
      user.loginotpcount += 1;
      await user.save();

      // Send OTP to email
      await sendEmail(user.email, "Your OTP Code", `Your OTP is: ${otp}`);

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
      });
    } else {
      throw createError.BadRequest("Invalid otpMethod. Use 'email' or 'authenticator'");
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Verify OTP and return JWT token
 * @route   POST /auth/verify-otp
 * @body    { email, otp, otpMethod, authkey? } 
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, otpMethod, authkey } = req.body;

    if (!email || !otp || !otpMethod) {
      throw createError.BadRequest("Email, OTP and otpMethod are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) throw createError.Unauthorized("User not found");

    let isValidOtp = false;

    if (otpMethod === "authenticator") {
      if (!user.authkey) throw createError.BadRequest("User has not set up Authenticator OTP");

      isValidOtp = speakeasy.totp.verify({
        secret: user.authkey,
        encoding: "base32",
        token: otp,
        window: 1,
      });
    } else if (otpMethod === "email") {
      isValidOtp = parseInt(otp) === user.otp;
      user.otp = null; // clear OTP after verification
      await user.save();
    } else {
      throw createError.BadRequest("Invalid otpMethod. Use 'email' or 'authenticator'");
    }

    if (!isValidOtp) throw createError.Unauthorized("Invalid OTP");

    // Save authkey if provided (only for authenticator)
    if (authkey && otpMethod === "authenticator" && !user.authkey) {
      user.authkey = authkey;
      await user.save();
    }

    const token = user.generateToken();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
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
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
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
      role,
      isVerified: true,
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
