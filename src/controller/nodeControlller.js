import { FileVersionModel } from "../models/NodeModel.js";
import { NodeModel } from "../models/NodeModel.js";
import createHttpError from "http-errors";

/**
 * @desc    Get the entire Node hierarchy from root
 * @route   GET /api/nodes/hierarchy
 * @access  Private
 */
export const getFullHierarchy = async (req, res, next) => {
  try {
    // 1️⃣ Fetch all root nodes (nodes with no parent)
    const rootNodes = await NodeModel.find({ parentId: null }).lean();

    if (!rootNodes || rootNodes.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Recursive function to fetch children
    const fetchChildren = async (node) => {
      // If node is a file, populate current version
      if (node.type === "file" && node.currentVersionId) {
        node.currentVersion = await FileVersionModel.findById(
          node.currentVersionId
        ).lean();
      }

      // Fetch children nodes
      const children = await NodeModel.find({ parentId: node._id }).lean();

      // Recursively fetch their children
      node.children = await Promise.all(
        children.map((child) => fetchChildren(child))
      );

      return node;
    };

    const hierarchy = await Promise.all(
      rootNodes.map((root) => fetchChildren(root))
    );

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    next(error);
  }
};
