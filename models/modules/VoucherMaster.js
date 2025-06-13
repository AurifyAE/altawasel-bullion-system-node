import mongoose from "mongoose";

const VoucherMasterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Voucher code is required"],
      trim: true,
      uppercase: true,
      maxlength: [10, "Voucher code cannot exceed 10 characters"],
      match: [/^[A-Z0-9]+$/, "Voucher code should contain only uppercase letters and numbers"],
    },
    description: {
      type: String,
      required: [true, "Voucher description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"]
    },
    voucherType: {
      type: String,
      required: [true, "Voucher type is required"],
      enum: ["PURCHASE", "SALE", "RECEIPT", "PAYMENT", "JOURNAL", "CONTRA"],
      uppercase: true
    },
    prefix: {
      type: String,
      required: [true, "Voucher prefix is required"],
      trim: true,
      uppercase: true,
      maxlength: [5, "Prefix cannot exceed 5 characters"],
      match: [/^[A-Z0-9]+$/, "Prefix should contain only uppercase letters and numbers"]
    },
    nextNumber: {
      type: Number,
      required: [true, "Next number is required"],
      min: [1, "Next number must be at least 1"],
      default: 1
    },
    numberLength: {
      type: Number,
      required: [true, "Number length is required"],
      min: [3, "Number length must be at least 3"],
      max: [10, "Number length cannot exceed 10"],
      default: 4
    },
    dateFormat: {
      type: String,
      required: [true, "Date format is required"],
      enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
      default: "DD/MM/YYYY"
    },
    isAutoIncrement: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
VoucherMasterSchema.index({ code: 1 });
VoucherMasterSchema.index({ voucherType: 1 });
VoucherMasterSchema.index({ status: 1 });
VoucherMasterSchema.index({ isActive: 1 });
VoucherMasterSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure uppercase codes
VoucherMasterSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  if (this.prefix) {
    this.prefix = this.prefix.toUpperCase();
  }
  if (this.voucherType) {
    this.voucherType = this.voucherType.toUpperCase();
  }
  next();
});

// Static method to check if code exists
VoucherMasterSchema.statics.isCodeExists = async function(code, excludeId = null) {
  const query = { code: code.toUpperCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const voucher = await this.findOne(query);
  return !!voucher;
};

// Static method to generate next voucher number
VoucherMasterSchema.statics.generateVoucherNumber = async function(voucherId) {
  const voucher = await this.findById(voucherId);
  if (!voucher) {
    throw new Error("Voucher not found");
  }
  
  const paddedNumber = String(voucher.nextNumber).padStart(voucher.numberLength, '0');
  const voucherNumber = `${voucher.prefix}${paddedNumber}`;
  
  // Increment next number if auto increment is enabled
  if (voucher.isAutoIncrement) {
    voucher.nextNumber += 1;
    await voucher.save();
  }
  
  return voucherNumber;
};

const VoucherMaster = mongoose.model("VoucherMaster", VoucherMasterSchema);
export default VoucherMaster;