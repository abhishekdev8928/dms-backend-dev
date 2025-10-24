import createHttpError from "http-errors";
import { NodeModel } from "../models/NodeModel.js";


/**
 * @desc    Get all departments
 * @route   GET /departments
 * @access  Private
 * @returns [{_id, label, type, status, createdAt, updatedAt}]
 */
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await NodeModel.find({ type: "department" }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (err) {
    next(createHttpError.InternalServerError(err.message));
  }
};


/**
 * @desc    Create a new department
 * @route   POST /departments
 * @access  Private (superadmin ideally)
 * @body    { label: String, status: Number (optional) }
 * @returns { _id, label, type, status, createdAt, updatedAt }
 */
export const createDepartment = async (req, res, next) => {
  try {
    const { label, status } = req.body;
    const trimmedLabel = label?.trim();

    if (!trimmedLabel) {
      throw createHttpError.BadRequest("Department label is required");
    }

    const existing = await NodeModel.findOne({ label: trimmedLabel, type: "department" });
    if (existing) {
      throw createHttpError.Conflict("Department with this label already exists");
    }

    const department = new NodeModel({
      label: trimmedLabel,
      type: "department",
      status: status || 1,
    });

    await department.save();

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Update an existing department
 * @route   PUT /departments/:id
 * @access  Private (superadmin ideally)
 * @body    { label: String, status: Number (optional) }
 * @returns { _id, label, type, status, createdAt, updatedAt }
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, status } = req.body;
    console.log(req.body)

    if (!label?.trim()) {
      throw createHttpError.BadRequest("Department label is required");
    }

    const existing = await NodeModel.findOne({
      _id: { $ne: id },
      label: label.trim(),
      type: "department",
    });
    if (existing) {
      throw createHttpError.Conflict("Another department with this label already exists");
    }

    const updated = await NodeModel.findByIdAndUpdate(
      id,
      { label: label.trim(), status: status || 1 },
      { new: true }
    );

    if (!updated) {
      throw createHttpError.NotFound("Department not found");
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Delete a department
 * @route   DELETE /departments/:id
 * @access  Private (superadmin ideally)
 * @returns { message: String }
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await NodeModel.findOneAndDelete({ _id: id, type: "department" });

    if (!deleted) {
      throw createHttpError.NotFound("Department not found");
    }

    res.status(200).json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    next(err);
  }
};