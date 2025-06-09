import mongoose from "mongoose";

const MetalStockSchema = new mongoose.Schema(
  {
    metalType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DivisionMaster",
      required: [true, "Metal type is required"],
    },
    code: {
      type: String,
      required: [true, "Metal stock code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "Metal stock code cannot exceed 20 characters"],
      match: [
        /^[A-Z0-9]+$/,
        "Metal stock code should contain only uppercase letters and numbers",
      ],
    },
    description: {
      type: String,
      required: [true, "Metal stock description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
       default: null,
    //   ref: "BranchMaster",
    //   required: [true, "Branch is required"],
    },
    karat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KaratMaster",
      required: [true, "Karat is required"],
    },
    standardPurity: {
      type: Number,
      required: [true, "Standard purity is required"],
      min: [0, "Standard purity cannot be negative"],
      max: [100, "Standard purity cannot exceed 100%"],
    },
    premiumDiscount: {
      type: Number,
      default: 0,
      min: [-100, "Premium/Discount cannot be less than -100%"],
      max: [100, "Premium/Discount cannot exceed 100%"],
    },
    charges: {
      type: mongoose.Schema.Types.ObjectId,
    //   ref: "ChargesMaster",
      default: null,
    },
    makingCharge: {
      type: mongoose.Schema.Types.ObjectId,
    //   ref: "ChargesMaster",
      default: null,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      maxlength: [20, "Unit cannot exceed 20 characters"],
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
    //   ref: "CostCenterMaster",
    //   required: [true, "Cost center is required"],
         default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainCategory",
      required: [true, "Category is required"],
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: [true, "Sub category is required"],
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Type",
      required: [true, "Type is required"],
    },
    size: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Size",
      default: null,
    },
    color: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      default: null,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CountryMaster",
      default: null,
    },
    price: {
      type: mongoose.Schema.Types.ObjectId,
    //   ref: "PriceMaster",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
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

// Indexes for better performance
MetalStockSchema.index({ code: 1 });
MetalStockSchema.index({ metalType: 1 });
MetalStockSchema.index({ branch: 1 });
MetalStockSchema.index({ category: 1 });
MetalStockSchema.index({ subCategory: 1 });
MetalStockSchema.index({ status: 1 });
MetalStockSchema.index({ isActive: 1 });
MetalStockSchema.index({ createdAt: -1 });

// Compound indexes
MetalStockSchema.index({ branch: 1, category: 1 });
MetalStockSchema.index({ metalType: 1, karat: 1 });

// Pre-save middleware to ensure uppercase codes
MetalStockSchema.pre("save", function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Static method to check if code exists
MetalStockSchema.statics.isCodeExists = async function (
  code,
  excludeId = null
) {
  const query = { code: code.toUpperCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const metalStock = await this.findOne(query);
  return !!metalStock;
};

const MetalStock = mongoose.model("MetalStock", MetalStockSchema);

export default MetalStock;
