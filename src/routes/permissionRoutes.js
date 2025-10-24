

// routes/permissionRoutes.js
import express from "express";
import { assignPermissions, listPermissions } from "../../controller/permissionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/commonMiddleware.js";

const router = express.Router();

// Assign permission to a node
router.post("/assign", authMiddleware, authorizeRole(["superadmin"]), assignPermissions);

// List permissions of a node
router.get("/:nodeId", authMiddleware,authorizeRole(["superadmin"]), listPermissions);

export default router;
