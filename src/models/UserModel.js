// models/UserModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    authkey: {
      type: String,
    },
    loginotpcount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "member", "bank"], // allowed roles
      default: "member",
    },
    otp: {
      type: Number,
    },
  },
  { timestamps: true, versionKey: false }
);

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 Compare password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// 🎫 Generate JWT token
userSchema.methods.generateToken = function (expiresIn = "7d") {
  const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    JWT_SECRET,
    { expiresIn }
  );
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
