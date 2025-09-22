const express = require('express');
const router = express.Router();
const DMS = require('../models/DmsModel.js');
const multer = require("multer");
const path = require("path");

// 📦 Reusable node creation logic
const createNode = async (req, res, type) => {
  try {
    const { label, parentId, meta } = req.body;

    const node = await DMS.create({
      label,
      type,
      parentId: parentId || null,
      meta,
    });

    res.status(201).json(node);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createNodeFile = async (req, res, type) => {
  try {
    let { label, parentId, meta, tags, visibility, department } = req.body;

    // Parse JSON fields if sent as strings
    tags = tags ? JSON.parse(tags) : [];
    meta = meta || {};
    
    // Add additional metadata for files
    if (type === "file" && req.file) {
      meta.fileName = req.file.originalname;
      meta.filePath = req.file.path;
      meta.tags = tags;
      meta.visibility = visibility;
      meta.department = department;
    }

    const node = await DMS.create({
      label: label || req.file?.originalname, // use file name if label not provided
      type,
      parentId: parentId || null,
      meta,
    });

    res.status(201).json(node);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder where files will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


async function buildTree(parentId = null) {
  // Fetch nodes with this parentId
  const nodes = await DMS.find({ parentId: parentId }).lean();

  // Build each node
  const tree = await Promise.all(nodes.map(async (node) => {
    const children = await buildTree(node._id);

    return {
      id: node._id.toString(),
      label: node.label,
      type: node.type, // <-- ✅ include the `type`
      children: children.length > 0 ? children : undefined,
      path:node.path
    };
  }));

  return tree;
}

router.get('/tree', async (req, res) => {
  try {
    const tree = await buildTree(null);  // starting from root (parentId = null)
    res.json(tree);
  } catch (error) {
    console.error('Error building tree:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/dms/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await DMS.find({ type: 'department' });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏢 Create Department (Top-level)
router.post('/departments', async (req, res) => {
  await createNode(req, res, 'department');
});


router.post("/categories", async (req, res) => {
  await createNode(req, res, "category");
});


router.get("/categories", async (req, res) => {
  try {
    const categories = await DMS.find({ type: "category" })
      .populate({
        path: "parentId",          // field in the category pointing to parent
        select: "_id label type",  // include _id along with label and type
      });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/categories/:id", async (req, res) => {
  try {
    const category = await DMS.findById(req.params.id);
    if (!category || category.type !== "category") {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put("/categories/:id", async (req, res) => {
  try {
    const { label, parentId, meta } = req.body;

    const updated = await DMS.findByIdAndUpdate(
      req.params.id,
      { label, parentId, meta },
      { new: true }
    );

    if (!updated || updated.type !== "category") {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.delete("/categories/:id", async (req, res) => {
  try {
    const deleted = await DMS.findByIdAndDelete(req.params.id);

    if (!deleted || deleted.type !== "category") {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗂️ Create Subcategory (Under category)
router.post('/subcategories', async (req, res) => {
  await createNode(req, res, 'sub-category');
});

router.get("/subcategories", async (req, res) => {
  try {
    const subcategories = await DMS.find({ type: "sub-category" })
      .populate({
        path: "parentId",      // populate parent category
        select: "_id label type parentId status",
        populate: {
          path: "parentId",    // populate department (parent of category)
          select: "_id label status",
        },
      });

    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update subcategory
router.put("/subcategories/:id", async (req, res) => {
  try {
    const { label, parentId } = req.body;
    const updated = await DMS.findByIdAndUpdate(
      req.params.id,
      { label, parentId },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete subcategory
router.delete("/subcategories/:id", async (req, res) => {
  try {
    await DMS.findByIdAndDelete(req.params.id);
    res.json({ message: "Subcategory deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📂 Create Folder (Under subcategory/category)
router.post('/folders', async (req, res) => {
  await createNode(req, res, 'folder');
});

// 📄 Create File (Inside folder)
router.post('/files',upload.single("file"), async (req, res) => {
  await createNodeFile(req, res, 'file');
});



// Get node by ID
router.get('/:id', async (req, res) => {
  try {
    const node = await DMS.findById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Node not found' });

    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get children of a node
router.get('/children/:parentId', async (req, res) => {
  try {
    const children = await DMS.find({ parentId: req.params.parentId });
    res.json(children);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a node
router.put('/:id', async (req, res) => {
  try {
    const node = await DMS.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!node) return res.status(404).json({ error: 'Node not found' });

    res.json(node);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete node (optional recursive)
router.delete('/:id', async (req, res) => {
  const { recursive = false } = req.query;

  try {
    const node = await DMS.findById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Node not found' });

    if (recursive === 'true') {
      const deleteNodeAndChildren = async (nodeId) => {
        const children = await DMS.find({ parentId: nodeId });
        for (const child of children) {
          await deleteNodeAndChildren(child._id);
        }
        await DMS.findByIdAndDelete(nodeId);
      };
      await deleteNodeAndChildren(node._id);
    } else {
      const hasChildren = await DMS.exists({ parentId: node._id });
      if (hasChildren) {
        return res.status(400).json({ error: 'Node has children. Use ?recursive=true to delete.' });
      }
      await DMS.findByIdAndDelete(node._id);
    }

    res.json({ message: 'Node deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






// GET /api/dms/categories/by-department/:departmentId
router.get('/categories/by-department/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;

    const categories = await DMS.find({
      type: 'category',
      parentId: departmentId,
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// GET /api/dms/subcategories/by-category/:categoryId
router.get('/subcategories/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subcategories = await DMS.find({
      type: 'sub-category',
      parentId: categoryId,
    });

    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
