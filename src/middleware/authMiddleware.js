// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import createError from "http-errors";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError.Unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

    console.log(token)
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      throw createError.Unauthorized("Invalid token");
    }
  } catch (err) {
    next(err);
  }
};





