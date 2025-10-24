// controllers/permissionController.js
import createError from "http-errors";
import { NodePermissionModel } from "../models/NodeModel.js";

/**
 * @desc    Assign permissions to a node (folder/file)
 * @route   POST /permissions/assign
 * @access  Private (only admin/superadmin)
 * @body    {
 *            nodeId: String,
 *            accessType: String, // "view", "upload", "edit", "delete", "download"
 *            role?: String,      // optional role
 *            userIds?: [String]  // optional array of userIds
 *         }
 */
export const assignPermissions = async (req, res, next) => {
  try {
    const { nodeId, accessType, role, userIds } = req.body;
    const grantedBy = req.user._id;

    if (!nodeId || !accessType) {
      throw createError.BadRequest("nodeId and accessType are required");
    }

    if (!role && (!userIds || userIds.length === 0)) {
      throw createError.BadRequest("Either role or userIds must be provided");
    }

    const permission = await NodePermissionModel.create({
      nodeId,
      accessType,
      role: role || undefined,
      userIds: userIds || undefined,
      grantedBy,
    });

    res.status(201).json({
      success: true,
      message: "Permission assigned successfully",
      data: permission,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    List all permissions for a node
 * @route   GET /permissions/:nodeId
 * @access  Private
 */
export const listPermissions = async (req, res, next) => {
  try {
    const { nodeId } = req.params;

    if (!nodeId) {
      throw createError.BadRequest("nodeId is required");
    }

    const permissions = await NodePermissionModel.find({ nodeId })
      .populate("userIds", "email role")
      .populate("grantedBy", "email role");

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions,
    });
  } catch (err) {
    next(err);
  }
};



