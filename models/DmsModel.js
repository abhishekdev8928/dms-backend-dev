const mongoose = require('mongoose');

const DmsSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
  type: String,
  enum: ['department', 'category', 'sub-category', 'folder', 'file'],
  required: true,
},
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DMS',
    default: null,
  },
  path: {
    type: String,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  }
}, {
  timestamps: true,
});

DmsSchema.pre('save', async function (next) {
  if (!this.isModified('label') && !this.isModified('parentId')) return next();

  try {
    // If no parent, it's a root node (category)
    if (!this.parentId) {
      this.path = `/${this.label}`;
    } else {
      // Lookup parent to build path
      const parent = await this.constructor.findById(this.parentId);
      if (!parent) {
        return next(new Error('Parent not found'));
      }
      this.path = `${parent.path}/${this.label}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});





module.exports = mongoose.model('DMS', DmsSchema);
