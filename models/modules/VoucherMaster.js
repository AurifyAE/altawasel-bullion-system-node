// import mongoose from "mongoose";

// const VoucherMasterSchema = new mongoose.Schema(
//   {
//     code: {
//       type: String,
//       trim: true,
//       uppercase: true,
//       unique: true, // Ensure uniqueness
//     },
//     description: {
//       type: String,
//       required: [true, "Voucher description is required"],
//       trim: true,
//       maxlength: [200, "Description cannot exceed 200 characters"],
//     },
//     voucherType: {
//       type: String,
//       required: [true, "Voucher type is required"],
//       uppercase: true,
//     },
//     prefix: {
//       type: String,
//       required: [true, "Voucher prefix is required"],
//       trim: true,
//       uppercase: true,
//       maxlength: [5, "Prefix cannot exceed 5 characters"],
//       match: [/^[A-Z0-9]+$/, "Prefix should contain only uppercase letters and numbers"],
//     },
//     numberLength: {
//       type: Number,
//       required: [true, "Number length is required"],
//       min: [3, "Number length must be at least 3"],
//       max: [10, "Number length cannot exceed 10"],
//       default: 4,
//     },
//     dateFormat: {
//       type: String,
//       required: [true, "Date format is required"],
//       enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
//       default: "DD/MM/YYYY",
//     },
//     isAutoIncrement: {
//       type: Boolean,
//       default: true,
//     },
//     module: {
//       type: String,
//       required: [true, "Module is required"],
//       trim: true,
//       unique: true,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     status: {
//       type: String,
//       enum: ["active", "inactive"],
//       default: "active",
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Admin",
//       required: true,
//     },
//     updatedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Admin",
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Indexes
// VoucherMasterSchema.index({ code: 1 });
// VoucherMasterSchema.index({ voucherType: 1 });
// VoucherMasterSchema.index({ module: 1 });
// VoucherMasterSchema.index({ status: 1 });
// VoucherMasterSchema.index({ isActive: 1 });
// VoucherMasterSchema.index({ createdAt: -1 });

// // Pre-save middleware
// VoucherMasterSchema.pre("save", function (next) {
//   if (this.prefix) this.prefix = this.prefix.toUpperCase();
//   if (this.voucherType) this.voucherType = this.voucherType.toUpperCase();
//   if (this.code) this.code = this.code.toUpperCase();
//   next();
// });

// // Static method to check if module exists
// VoucherMasterSchema.statics.isModuleExists = async function (module, excludeId = null) {
//   const query = { module };
//   if (excludeId) query._id = { $ne: excludeId };
//   const voucher = await this.findOne(query);
//   return !!voucher;
// };

// const VoucherMaster = mongoose.model("VoucherMaster", VoucherMasterSchema);
// export default VoucherMaster;

import mongoose from "mongoose";

const VoucherMasterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true, // Implicitly creates a unique index
    },
    description: {
      type: String,
      required: [true, "Voucher description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    voucherType: {
      type: String,
      required: [true, "Voucher type is required"],
      uppercase: true,
    },
    prefix: {
      type: String,
      required: [true, "Voucher prefix is required"],
      trim: true,
      uppercase: true,
      maxlength: [5, "Prefix cannot exceed 5 characters"],
      match: [/^[A-Z0-9]+$/, "Prefix should contain only uppercase letters and numbers"],
    },
    numberLength: {
      type: Number,
      required: [true, "Number length is required"],
      min: [3, "Number length must be at least 3"],
      max: [10, "Number length cannot exceed 10"],
      default: 4,
    },
    dateFormat: {
      type: String,
      required: [true, "Date format is required"],
      enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
      default: "DD/MM/YYYY",
    },
    isAutoIncrement: {
      type: Boolean,
      default: true,
    },
    module: {
      type: String,
      required: [true, "Module is required"],
      trim: true,
      unique: true, // Implicitly creates a unique index
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (remove duplicates for code and module)
VoucherMasterSchema.index({ voucherType: 1 });
VoucherMasterSchema.index({ status: 1 });
VoucherMasterSchema.index({ isActive: 1 });
VoucherMasterSchema.index({ createdAt: -1 });

// Pre-save middleware
VoucherMasterSchema.pre("save", function (next) {
  if (this.prefix) this.prefix = this.prefix.toUpperCase();
  if (this.voucherType) this.voucherType = this.voucherType.toUpperCase();
  if (this.code) this.code = this.code.toUpperCase();
  next();
});

// Static method to check if module exists
VoucherMasterSchema.statics.isModuleExists = async function (module, excludeId = null) {
  const query = { module };
  if (excludeId) query._id = { $ne: excludeId };
  const voucher = await this.findOne(query);
  return !!voucher;
};

const VoucherMaster = mongoose.model("VoucherMaster", VoucherMasterSchema);
export default VoucherMaster;