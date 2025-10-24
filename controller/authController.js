import createError from "http-errors";
import UserModel from "../src/models/UserModel.js";
import bcrypt from "bcryptjs";

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
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

    // Create user (password is hashed automatically via pre-save hook)
    const user = new UserModel({ email, password, role, isVerified: true });
    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /auth/login
 * @access  Public
 * @body    { email, password }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError.BadRequest("Email and password are required");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw createError.Unauthorized("Invalid email or password");
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError.Unauthorized("Invalid email or password");
    }

    // Generate JWT token
    const token = user.generateToken();

    res.status(200).json({
      success: true,
      message: "Login successful",
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
