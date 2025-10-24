import createHttpError from "http-errors";
import { NodeModel } from "../src/models/NodeModel.js";

/**
 * @desc    Get all categories
 * @route   GET /categories
 * @access  Private
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await NodeModel.find({ type: "category" }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(createHttpError.InternalServerError(err.message));
  }
};

/**
 * @desc    Create a new category
 * @route   POST /categories
 * @body    { label: String, parentId: ObjectId, status?: Number }
 */
export const createCategory = async (req, res, next) => {
  try {
    const { label, parentId, status } = req.body;
    const trimmedLabel = label?.trim();

    if (!trimmedLabel) throw createHttpError.BadRequest("Category label is required");
    if (!parentId) throw createHttpError.BadRequest("Parent department ID is required");

    // Check that parent exists and is a department
    const parentNode = await NodeModel.findOne({ _id: parentId, type: "department" });
    if (!parentNode) throw createHttpError.BadRequest("Invalid parent department");

    // Check duplicate category under the same parent
    const existing = await NodeModel.findOne({ label: trimmedLabel, type: "category", parentId });
    if (existing) throw createHttpError.Conflict("Category with this label already exists under this department");

    const category = new NodeModel({
      label: trimmedLabel,
      type: "category",
      parentId,
      status: status || 1,
    });

    await category.save();

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update an existing category
 * @route   PATCH /categories/:id
 * @body    { label: String, parentId?: ObjectId, status?: Number }
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, parentId, status } = req.body;

    if (!label?.trim()) throw createHttpError.BadRequest("Category label is required");

    // Check that parent exists if provided
    if (parentId) {
      const parentNode = await NodeModel.findOne({ _id: parentId, type: "department" });
      if (!parentNode) throw createHttpError.BadRequest("Invalid parent department");
    }

    // Check duplicate under the same parent
    const existing = await NodeModel.findOne({
      _id: { $ne: id },
      label: label.trim(),
      type: "category",
      parentId: parentId || null,
    });
    if (existing) throw createHttpError.Conflict("Another category with this label exists under this department");

    const updated = await NodeModel.findByIdAndUpdate(
      id,
      { label: label.trim(), parentId, status: status || 1 },
      { new: true }
    );

    if (!updated) throw createHttpError.NotFound("Category not found");

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /categories/:id
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await NodeModel.findOneAndDelete({ _id: id, type: "category" });

    if (!deleted) throw createHttpError.NotFound("Category not found");

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
};
