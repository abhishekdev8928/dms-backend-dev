import express from "express";
import {
  addNewFileVersion,
  checkFileExists,
  generatePresignedUrls,
  getFileVersions,
  replaceFile,
  saveFileMetadata,
  searchFiles
} from "../../controller/fileController.js";

const router = express.Router();

// Generate pre-signed URLs for uploading files
router.post("/presigned-url", generatePresignedUrls);

// Save uploaded file metadata to the database
router.post("/save", saveFileMetadata);

// Check if a file already exists in a folder
router.get("/check", checkFileExists);

// Add a new version to an existing file
router.post("/:fileId/new-version", addNewFileVersion);

// Replace an existing file completely
router.put("/:fileId/replace", replaceFile);

// Search and filter files
router.get("/files/search", searchFiles);


// GET /api/files/:fileId/versions
router.get("/:fileId/versions", getFileVersions);


export default router;
