import express from "express";
import {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} from "../controller/departmentController.js";

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controller/categoryController.js";
import { getFullHierarchy } from "../controller/nodeControlller.js";
import {
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
} from "../controller/subCategoryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { NodePermissionModel } from "../models/NodeModel.js";

import createError from "http-errors";

const router = express.Router();

export const nodeAccessMiddleware =
  (requiredAction) => async (req, res, next) => {
    try {
      const user = req.user; // set by authMiddleware
      console.log(req.user);
      const nodeId = req.params.id || req.body.nodeId;

      if (!nodeId) return next(createError.BadRequest("Node ID is required"));

      if (user.role === "superadmin") return next(); // superadmin bypass

      const permission = await NodePermissionModel.findOne({
        nodeId,
        $or: [{ userIds: user._id }, { role: user.role }],
      });

      if (!permission || !permission.accessType.includes(requiredAction)) {
        return next(
          createError.Forbidden("You do not have permission for this action")
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };

// --------------------
// Department Routes
// --------------------
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.patch(
  "/departments/:id",
  updateDepartment
);
router.delete("/departments/:id", deleteDepartment);

// --------------------
// Category Routes
// --------------------
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// --------------------
// Sub-Category Routes
// --------------------
router.get("/sub-categories", getSubCategories);
router.post("/sub-categories", createSubCategory);
router.patch("/sub-categories/:id", updateSubCategory);
router.delete("/sub-categories/:id", deleteSubCategory);







// Fetch the entire hierarchy starting from root
router.get("/nodes/hierarchy", getFullHierarchy);




export default router;
