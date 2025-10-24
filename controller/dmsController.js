import createHttpError from "http-errors";
import { NodeModel } from "../src/models/NodeModel.js";

/*
export const createNode = async (req, res, type, next) => {
  try {
    const { label, parentId, tags, visibility } = req.body;

    const nodeData = {
      label,
      type,
      parentId: parentId || null,
    };

    if (type === "file" || type === "folder") {
      nodeData.tags = Array.isArray(tags) ? tags : [];
      nodeData.visibility = visibility || "Private";
    }

    const node = await Nodemodel.create(nodeData);

    res.status(201).json(node);
  } catch (error) {
    next(createError(400, error.message));
  }
};




// -----------------------------
// File node creation with metadata
// -----------------------------
export const createNodeFile = async (req, res, next, type) => {
  try {
    let { label, parentId, tags, visibility, department, imageId, size, mimeType } = req.body;

    if (type === "file" && !imageId) throw createError(400, "imageId is required for files");

    // Ensure tags is an array
    tags = typeof tags === "string" ? JSON.parse(tags || "[]") : tags || [];

    // Wrap file-specific fields in fileMeta
    const fileMeta = type === "file" ? {
      imageId,
      size: size || 0,
      mimeType: mimeType || "application/octet-stream",
    } : undefined;

    const node = await Nodemodel.create({
      label,        
      type,
      parentId: parentId || null,
      fileMeta,  
      tags,
      visibility: visibility || "Private",
    });

    res.status(201).json(node);
  } catch (error) {
    next(createError(error.status || 400, error.message));
  }
};


// -----------------------------
// Recursive tree builder
// -----------------------------
async function buildTree(parentId = null) {
  const nodes = await Nodemodel.find({ parentId }).lean();

  return Promise.all(
    nodes.map(async (node) => {
      const children = await buildTree(node._id);

      const treeNode = {
        id: node._id.toString(),
        label: node.label,
        type: node.type,
        children: children.length > 0 ? children : undefined,
        path: node.path,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        tags: node.tags,
        visibility: node.visibility,
      };

      // Include file metadata if it's a file
      if (node.type === "file" && node.fileMeta) {
        treeNode.fileMeta = {
          imageId: node.fileMeta.imageId,
          size: node.fileMeta.size,
          mimeType: node.fileMeta.mimeType,
        };
      }

      return treeNode;
    })
  );
}

// -----------------------------
// Tree & nodes
// -----------------------------
export const getTree = async (req, res, next) => {
  try {
    const tree = await buildTree(null);
    res.status(200).json(tree);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const getNodeById = async (req, res, next) => {
  try {
    const node = await Nodemodel.findById(req.params.id);
    if (!node) throw createError(404, "Node not found");
    res.json(node);
  } catch (error) {
    next(error);
  }
};

export const getChildren = async (req, res, next) => {
  try {
    const children = await Nodemodel.find({ parentId: req.params.parentId });
    res.json(children);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Nodemodel.find({ type: "department" });
    res.json(departments);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { label } = req.body;

    if (!label || label.trim() === "") {
      throw createError(400, "Department name is required");
    }

    const department = new Nodemodel({
      label: label.trim(),
      type: "department",
    });

    await department.save();

    res.status(201).json({
      message: "Department created successfully",
      data: department,
    });
  } catch (err) {
    next(err); // pass error to your global error middleware
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Nodemodel.find({ type: "category" }).populate({
      path: "parentId",
      select: "_id label type",
    });
    res.json(categories);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const createCategory = async (req, res, next) => {
  await createNode(req, res, "category", next);
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Nodemodel.findById(req.params.id);
    if (!category || category.type !== "category") {
      throw createError(404, "Category not found");
    }
    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { label, parentId, meta } = req.body;
    const updated = await Nodemodel.findByIdAndUpdate(
      req.params.id,
      { label, parentId, meta },
      { new: true }
    );
    if (!updated || updated.type !== "category") {
      throw createError(404, "Category not found");
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const deleted = await Nodemodel.findByIdAndDelete(req.params.id);
    if (!deleted || deleted.type !== "category") {
      throw createError(404, "Category not found");
    }
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// CRUD: Sub-category
// -----------------------------
export const createSubCategory = async (req, res, next) => {
  await createNode(req, res, "sub-category", next);
};

export const getSubCategories = async (req, res, next) => {
  try {
    const subcategories = await Nodemodel.find({ type: "sub-category" }).populate({
      path: "parentId",
      select: "_id label type parentId status",
      populate: { path: "parentId", select: "_id label status" },
    });
    res.json(subcategories);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const updateSubCategory = async (req, res, next) => {
  try {
    const { label, parentId } = req.body;
    const updated = await Nodemodel.findByIdAndUpdate(
      req.params.id,
      { label, parentId },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteSubCategory = async (req, res, next) => {
  try {
    await Nodemodel.findByIdAndDelete(req.params.id);
    res.json({ message: "Subcategory deleted" });
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// CRUD: Folder
// -----------------------------
export const createFolder = async (req, res, next) => {
  await createNode(req, res, "folder", next);
};

// -----------------------------
// CRUD: File
export const createFile = async (req, res, next) => {
  try {
    const {
      imageId,      // S3 key
      size,
      mimeType,
      label,
      tags,
      visibility,
      parentId,
      checksum,     // optional
      note,         // optional
    } = req.body;

    if (!imageId || !label) {
      throw createError(400, "imageId and label are required");
    }

    // 🧩 TEMP: Hardcode uploadedBy until auth middleware is added
    const uploadedBy = "system-user"; // replace with real user ID later

    // Check if same file exists under same parent
    const existingFile = await Nodemodel.findOne({
      label,
      parentId: parentId || null,
      type: "file",
    });

    let newFile;

    if (existingFile) {
      // ✅ Add new version to existing file
      const newVersionNumber = (existingFile.currentVersion || 0) + 1;

      const newVersion = {
        versionNumber: newVersionNumber,
        storageKey: imageId,
        size,
        mimeType,
        uploadedBy,
        checksum: checksum || null,
        note: note || `Version ${newVersionNumber} uploaded`,
      };

      existingFile.versions.push(newVersion);
      existingFile.currentVersion = newVersionNumber;

      await existingFile.save();
      newFile = existingFile;
    } else {
      // ✅ Create brand new file node
      newFile = await Nodemodel.create({
        label,
        type: "file",
        parentId: parentId || null,
        tags: tags || [],
        visibility: visibility || "Private",
        uploadedBy,
        versions: [
          {
            versionNumber: 1,
            storageKey: imageId,
            size,
            mimeType,
            uploadedBy,
            checksum: checksum || null,
            note: note || "Initial upload",
          },
        ],
        currentVersion: 1,
      });
    }

    return res.status(201).json({
      success: true,
      message: existingFile
        ? `New version created (v${newFile.currentVersion})`
        : "File created successfully",
      data: newFile,
    });
  } catch (error) {
    console.error("❌ createFile error:", error);
    next(createError(500, error.message || "Failed to create file"));
  }
};



// -----------------------------
// CRUD: Node
// -----------------------------
export const updateNode = async (req, res, next) => {
  try {
    const node = await Nodemodel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!node) throw createError(404, "Node not found");
    res.json(node);
  } catch (error) {
    next(error);
  }
};

export const deleteNode = async (req, res, next) => {
  const { recursive = false } = req.query;
  try {
    const node = await Nodemodel.findById(req.params.id);
    if (!node) throw createError(404, "Node not found");

    if (recursive === "true") {
      const deleteNodeAndChildren = async (nodeId) => {
        const children = await Nodemodel.find({ parentId: nodeId });
        for (const child of children) {
          await deleteNodeAndChildren(child._id);
        }
        await Nodemodel.findByIdAndDelete(nodeId);
      };
      await deleteNodeAndChildren(node._id);
    } else {
      const hasChildren = await Nodemodel.exists({ parentId: node._id });
      if (hasChildren) {
        throw createError(400, "Node has children. Use ?recursive=true to delete.");
      }
      await Nodemodel.findByIdAndDelete(node._id);
    }

    res.json({ message: "Node deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// Filter by parent
// -----------------------------
export const getCategoriesByDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const categories = await Nodemodel.find({
      type: "category",
      parentId: departmentId,
    });
    res.json(categories);
  } catch (error) {
    next(createError(500, error.message));
  }
};

export const getSubCategoriesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await Nodemodel.find({
      type: "sub-category",
      parentId: categoryId,
    });
    res.json(subcategories);
  } catch (error) {
    next(createError(500, error.message));
  }
};


*/







