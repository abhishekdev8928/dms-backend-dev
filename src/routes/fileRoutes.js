import express from "express";
import {
  reUploadFile,
  checkFileExists,
  generatePresignedUrls,
  getFileVersions,
 
  saveFileMetadata,
  searchFiles
} from "../controller/fileController.js";

const router = express.Router();

// Generate pre-signed URLs for uploading files
router.post("/presigned-url", generatePresignedUrls);

// Save uploaded file metadata to the database
router.post("/save", saveFileMetadata);

// Check if a file already exists in a folder
router.get("/check", checkFileExists);


// Search and filter files
router.get("/search", searchFiles);


router.post("/:fileId/reupload",reUploadFile);


// GET /api/files/:fileId/versions
router.get("/:fileId/versions", getFileVersions);


export default router;
