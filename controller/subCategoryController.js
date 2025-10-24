



import createHttpError from "http-errors";
import { NodeModel } from "../src/models/NodeModel.js";

/**
 * @desc    Get all sub-categories
 * @route   GET /sub-categories
 * @access  Private
 * @returns [{_id, label, type, status, parentId, createdAt, updatedAt}]
 */
export const getSubCategories = async (req, res, next) => {
  try {
    const subCategories = await NodeModel.find({ type: "sub-category" }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: subCategories.length,
      data: subCategories,
    });
  } catch (err) {
    next(createHttpError.InternalServerError(err.message));
  }
};

/**
 * @desc    Create a new sub-category
 * @route   POST /sub-categories
 * @access  Private (superadmin ideally)
 * @body    { label: String, parentId: ObjectId, status?: Number }
 * @returns { _id, label, type, parentId, status, createdAt, updatedAt }
 */
export const createSubCategory = async (req, res, next) => {
  try {
    const { label, parentId, status } = req.body;
    const trimmedLabel = label?.trim();

    if (!trimmedLabel) {
      throw createHttpError.BadRequest("Sub-category label is required");
    }
    if (!parentId) {
      throw createHttpError.BadRequest("Parent category ID is required");
    }

    const existing = await NodeModel.findOne({ label: trimmedLabel, type: "sub-category" });
    if (existing) {
      throw createHttpError.Conflict("Sub-category with this label already exists");
    }

    const subCategory = new NodeModel({
      label: trimmedLabel,
      type: "sub-category",
      parentId,
      status: status || 1,
    });

    await subCategory.save();

    res.status(201).json({ success: true, data: subCategory });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update an existing sub-category
 * @route   PUT /sub-categories/:id
 * @access  Private (superadmin ideally)
 * @body    { label: String, parentId?: ObjectId, status?: Number }
 * @returns { _id, label, type, parentId, status, createdAt, updatedAt }
 */
export const updateSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, parentId, status } = req.body;

    if (!label?.trim()) {
      throw createHttpError.BadRequest("Sub-category label is required");
    }

    const existing = await NodeModel.findOne({
      _id: { $ne: id },
      label: label.trim(),
      type: "sub-category",
    });
    if (existing) {
      throw createHttpError.Conflict("Another sub-category with this label already exists");
    }

    const updated = await NodeModel.findByIdAndUpdate(
      id,
      { label: label.trim(), parentId, status: status || 1 },
      { new: true }
    );

    if (!updated) {
      throw createHttpError.NotFound("Sub-category not found");
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a sub-category
 * @route   DELETE /sub-categories/:id
 * @access  Private (superadmin ideally)
 * @returns { message: String }
 */
export const deleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await NodeModel.findOneAndDelete({ _id: id, type: "sub-category" });

    if (!deleted) {
      throw createHttpError.NotFound("Sub-category not found");
    }

    res.status(200).json({ success: true, message: "Sub-category deleted successfully" });
  } catch (err) {
    next(err);
  }
};
