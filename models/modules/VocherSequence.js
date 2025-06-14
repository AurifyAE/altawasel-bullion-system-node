

import mongoose from "mongoose";

const VoucherSequenceSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: [true, "Module is required"],
      unique: true, // Implicitly creates a unique index
      trim: true,
    },
    sequence: {
      type: Number,
      default: 1,
      min: [1, "Sequence must be at least 1"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (remove duplicate for module)
VoucherSequenceSchema.index({ isActive: 1 });

// Static method to check if module exists
VoucherSequenceSchema.statics.isModuleExists = async function (module, excludeId = null) {
  const query = { module };
  if (excludeId) query._id = { $ne: excludeId };
  const sequence = await this.findOne(query);
  return !!sequence;
};

const VoucherSequence = mongoose.model("VoucherSequence", VoucherSequenceSchema);
export default VoucherSequence;
