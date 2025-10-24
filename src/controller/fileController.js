import { v4 as uuidv4 } from "uuid";
import createHttpError from "http-errors";
import createPresignedUrlWithClient from "../utils/presignedUrl.js";
import { NodeModel, FileVersionModel } from "../models/NodeModel.js";

/**
 * @desc    Generate pre-signed URLs for file uploads
 * @route   POST /files/presigned-url
 * @access  Private
 * @body    { files: [{ filename: String, mimeType: String }] }
 * @returns [{ filename, key, url }]
 */
export const generatePresignedUrls = async (req, res, next) => {
  try {
    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      throw createHttpError.BadRequest("No files provided");
    }

    const result = [];

    for (const file of files) {
      const { filename, mimeType } = file;

      if (!filename || !mimeType) {
        throw createHttpError.BadRequest(
          `filename and MIME type are required for each file`
        );
      }

      const uniqueId = uuidv4();
      const extension = mimeType.split("/")[1] || "bin";
      const objectKey = `files/${uniqueId}.${extension}`;

      const url = await createPresignedUrlWithClient({
        key: objectKey,
        mimeType,
      });

      result.push({
        filename,
        key: objectKey,
        url,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save a new file and create its initial version
 * @route   POST /files/save
 * @access  Private
 * @body    {
 *            label: string,
 *            mimeType: string,
 *            size: number,
 *            storageKey: string,
 *            uploadedBy: ObjectId,
 *            parentId?: ObjectId,
 *            note?: string,
 *            checksum?: string,
 *            tags?: string[]
 *         }
 */

export const saveFileMetadata = async (req, res, next) => {
  try {
    const {
      label,
      parentId,
      mimeType,
      size,
      storageKey,
      uploadedBy,
      note,
      checksum,
      tags,
    } = req.body;

    if (!label?.trim() || !mimeType || !size || !storageKey || !uploadedBy) {
      throw createHttpError.BadRequest("Missing required fields");
    }

    // 1️⃣ Create file Node
    const fileNode = await NodeModel.create({
      label: label.trim(),
      type: "file",
      parentId: parentId || null,
      mimeType,
      size,
      uploadedBy,
      tags: tags || [],
    });

    // 2️⃣ Create initial FileVersion
    const initialVersion = await FileVersionModel.create({
      fileId: fileNode._id,
      versionNumber: 1,
      storageKey,
      size,
      mimeType,
      uploadedBy,
      note: note || "",
      checksum: checksum || null,
      isActive: true,
    });

    // 3️⃣ Update Node to point to current version
    fileNode.currentVersionId = initialVersion._id;
    await fileNode.save();

    // 4️⃣ Return Node + version
    res.status(201).json({
      success: true,
      message: "File saved successfully with initial version",
      node: fileNode,
      version: initialVersion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if file with same label exists inside a folder
 * @route   GET /files/check
 * @access  Private
 * @query   label, parentId
 */
export const checkFileExists = async (req, res, next) => {
  try {
    const { label, parentId } = req.query;

    if (!label || !parentId) {
      throw createHttpError.BadRequest("label and parentId are required");
    }

    const existingFile = await NodeModel.findOne({
      label: label.trim(),
      parentId,
      type: "file",
    });

    res.status(200).json({
      exists: !!existingFile,
      file: existingFile || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Replace an existing file completely
 * @route   PUT /files/:fileId/reupload
 * @access  Private
 * @body    { storageKey, size, mimeType, uploadedBy, note?, checksum? }
 */
export const reUploadFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { storageKey, size, mimeType, uploadedBy, note, checksum } = req.body;

    if (!storageKey || !size || !mimeType || !uploadedBy) {
      throw createHttpError.BadRequest("Missing required fields");
    }

    // Find the Node
    const node = await NodeModel.findById(fileId);
    if (!node) {
      throw createHttpError.NotFound("File (Node) not found");
    }

    // Find latest version for this file
    const latestVersion = await FileVersionModel.findOne({ fileId }).sort({
      versionNumber: -1,
    });

    const newVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    // Create new FileVersion
    const newFileVersion = await FileVersionModel.create({
      fileId,
      versionNumber: newVersionNumber,
      storageKey,
      size,
      mimeType,
      uploadedBy,
      note: note || "",
      checksum: checksum || null,
      isActive: true,
    });

    // Mark previous version as inactive
    if (latestVersion) {
      latestVersion.isActive = false;
      await latestVersion.save();
    }

    // Update Node to point to current version
    node.currentVersionId = newFileVersion._id;
    await node.save();

    res.status(200).json({
      message: "File replaced successfully",
      version: newFileVersion,
      node,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search and filter files/folders
 * @route   GET /files/search
 * @access  Private
 * @query
 *    q        -> search text for label
 *    tags     -> comma separated tags
 *    type     -> file/folder
 *    uploader -> userId
 *    startDate -> ISO string
 *    endDate   -> ISO string
 *    departmentId -> parent department Id
 *    visibility -> Private/Public/Restricted
 */
export const searchFiles = async (req, res, next) => {
  try {
    const {
      q,
      tags,
      type,
      uploader,
      startDate,
      endDate,
      departmentId,
      visibility,
    } = req.query;

    const filter = { type: { $in: ["file", "folder"] } }; // Only files/folders

    // Search by label/title
    if (q) {
      filter.label = { $regex: q.trim(), $options: "i" }; // case-insensitive
    }

    // Filter by tags
    if (tags) {
      const tagsArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $all: tagsArray };
    }

    // Filter by type
    if (type) filter.type = type;

    // Filter by uploader
    if (uploader && mongoose.Types.ObjectId.isValid(uploader)) {
      filter.uploadedBy = uploader;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Filter by department/parent folder
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      filter.parentId = departmentId;
    }

    // Filter by visibility
    if (visibility) filter.visibility = visibility;

    const results = await NodeModel.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    next(createHttpError.InternalServerError(err.message));
  }
};

/**
 * @desc    Get all versions of a specific file
 * @route   GET /files/:fileId/versions
 * @access  Private
 * @params  fileId - ID of the file
 * @returns [{ versionNumber, storageKey, size, mimeType, uploadedBy, uploadedAt, note }]
 */
export const getFileVersions = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      throw createError.BadRequest("File ID is required");
    }

    // Fetch all versions for the file, sorted by versionNumber descending
    const versions = await FileVersionModel.find({ fileId }).sort({
      versionNumber: -1,
    });
    //   .populate("uploadedBy", "name email");

    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (err) {
    next(err);
  }
};
