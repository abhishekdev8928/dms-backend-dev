import mongoose from "mongoose";

const NodeSchema = new mongoose.Schema(
  {
    // Common field for all nodes
    label: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["department", "category", "sub-category", "folder", "file"],
      required: true,
    },

    status: { type: Number, enum: [0, 1], default: 1 },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      default: null,
      index: true,
    },

    tags: {
      type: [String],
      required: function () {
        return this.type === "folder" || this.type === "file";
      },
      default: function () {
        return ["folder", "file"].includes(this.type) ? [] : undefined;
      },
    },

    // Visibility: folder/file/department/category/sub-category
    visibility: {
      type: String,
      enum: ["Private", "Public", "Restricted"],
      default: "Private",
    },

    // File-specific fields
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileVersion",
      required:false
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === "file";
      },
    },
    size: {
      type: Number,
      required: function () {
        return this.type === "file";
      },
      default: function () {
        return this.type === "file" ? 0 : undefined;
      },
    },
    mimeType: {
      type: String,
      required: function () {
        return this.type === "file";
      },
      default: function () {
        return this.type === "file" ? "application/octet-stream" : undefined;
      },
    },
  },
  { timestamps: true }
);

// Indexes for performance
NodeSchema.index({ parentId: 1, type: 1 });
NodeSchema.index({ type: 1, label: 1 });
NodeSchema.index({ path: 1 });

// Pre-save hook: ensure file fields are valid
NodeSchema.pre("save", function (next) {
  if (this.type === "file") {
    if (!this.uploadedBy)
      return next(new Error("uploadedBy is required for files"));
    if (!this.mimeType) this.mimeType = "application/octet-stream";
    if (!this.currentVersion && this.currentVersion !== 0)
      this.currentVersion = 0;
    if (!this.size && this.size !== 0) this.size = 0;
    if (!this.path) this.path = "";
  }
  next();
});

export const NodeModel = mongoose.model("Node", NodeSchema);

/////////////////////////
// 2️⃣ File Version Schema
/////////////////////////
const FileVersionSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    versionNumber: { type: Number, required: true },
    storageKey: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    checksum: { type: String, default: null },
    isActive: { type: Boolean, default: true }, // for rollback / restoration
  },
  { timestamps: true }
);

FileVersionSchema.index({ fileId: 1, versionNumber: -1 });
FileVersionSchema.index({ fileId: 1, uploadedAt: -1 });

export const FileVersionModel = mongoose.model(
  "FileVersion",
  FileVersionSchema
);

/////////////////////////
// 3️⃣ Node Permission Schema
/////////////////////////
const NodePermissionSchema = new mongoose.Schema(
  {
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },

    // Either assign specific users
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Or assign by role
    role: { type: String },

    accessType: {
      type: [String],
      enum: ["view", "upload", "edit", "delete", "download"],
      required: true,
    },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    grantedAt: { type: Date, default: Date.now },
    inherit: { type: Boolean, default: true }, // cascade to child nodes
  },
  { timestamps: true }
);

// ✅ Custom validator: either userIds or role must exist
NodePermissionSchema.pre("validate", function (next) {
  if ((!this.userIds || this.userIds.length === 0) && !this.role) {
    return next(new Error("Either userIds or role must be provided"));
  }
  next();
});

export const NodePermissionModel = mongoose.model(
  "NodePermission",
  NodePermissionSchema
);

/////////////////////////
// 4️⃣ Audit Log Schema
/////////////////////////
const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: {
      type: String,
      enum: ["upload", "download", "view", "delete", "restore", "edit"],
      required: true,
    },
    nodeId: { type: mongoose.Schema.Types.ObjectId, ref: "Node" },
    versionNumber: { type: Number },
    details: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ nodeId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema);
