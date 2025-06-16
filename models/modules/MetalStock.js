import mongoose from "mongoose";
import Registry from "./Registry.js";

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
      required: [true, "Metal description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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
    pcs: {
      type: Boolean,
      default: false, // true for pieces, false for weight-based
      required: [true, "Pieces tracking option is required"],
    },
    pcsCount: {
      type: Number,
      default: 0,
      min: [0, "Piece count cannot be negative"],
      validate: {
        validator: function (value) {
          return !this.pcs || Number.isInteger(value);
        },
        message: "Piece count must be an integer when pcs is true",
      },
    },
    totalValue: {
      type: Number,
      default: 0,
      min: [0, "Total value cannot be negative"],
    },
    charges: {
      type: Number,
      default: 0,
    },
    makingCharge: {
      type: Number,
      default: 0,
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
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
MetalStockSchema.index({ code: 1, isActive: 1 });
MetalStockSchema.index({ metalType: 1 });
MetalStockSchema.index({ branch: 1 });
MetalStockSchema.index({ category: 1 });
MetalStockSchema.index({ subCategory: 1 });
MetalStockSchema.index({ status: 1 });
MetalStockSchema.index({ isActive: 1 });
MetalStockSchema.index({ createdAt: -1 });
MetalStockSchema.index({ karat: 1 });
MetalStockSchema.index({ pcs: 1 });
MetalStockSchema.index({ pcsCount: 1 });
MetalStockSchema.index({ totalValue: 1 });

// Compound indexes
MetalStockSchema.index({ branch: 1, category: 1 });
MetalStockSchema.index({ metalType: 1, karat: 1 });

// Pre-save middleware to ensure uppercase codes, validate purity, and enforce pcs logic
MetalStockSchema.pre("save", async function (next) {
  try {
    if (this.code) {
      this.code = this.code.toUpperCase();
    }

    // Sync standardPurity with KaratMaster
    if (this.isModified("karat")) {
      const KaratMaster = mongoose.model("KaratMaster");
      const karat = await KaratMaster.findById(this.karat);
      if (!karat) {
        return next(new Error("Invalid karat ID"));
      }
      this.standardPurity = karat.standardPurity;
    }

    // Enforce pcsCount and totalValue to 0 when pcs is false
    if (!this.pcs) {
      this.pcsCount = 0;
      this.totalValue = 0;
    } else {
      // Validate pcsCount and totalValue when pcs is true
      if (
        this.pcsCount === null ||
        this.pcsCount === undefined ||
        this.pcsCount < 0
      ) {
        return next(
          new Error(
            "Piece count is required and must be non-negative when pcs is true"
          )
        );
      }
      if (
        this.totalValue === null ||
        this.totalValue === undefined ||
        this.totalValue < 0
      ) {
        return next(
          new Error(
            "Total value is required and must be non-negative when pcs is true"
          )
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to create Registry entries when stock is added
MetalStockSchema.post("save", async function (doc, next) {
  try {
    // Only create registry entries for new documents with initial stock
    if (doc.isNew && (doc.pcsCount > 0 || doc.totalValue > 0)) {
      await doc.createRegistryEntries("initial_stock", "Initial stock entry");
    }
    next();
  } catch (error) {
    console.error("Error creating registry entries:", error);
    next();
  }
});

// Method to create Registry entries for stock transactions
MetalStockSchema.methods.createRegistryEntries = async function (transactionType, description, costCenterCode = null) {
  try {
    const registryEntries = [];
    
    // Get metal type for determining registry type
    await this.populate('metalType', 'code description');
    const metalTypeCode = this.metalType.code.toLowerCase();
    
    // Determine cost center code
    let finalCostCenterCode = costCenterCode;
    if (!finalCostCenterCode && this.costCenter) {
      const CostCenter = mongoose.model("CostCenter");
      const costCenter = await CostCenter.findById(this.costCenter);
      finalCostCenterCode = costCenter ? costCenter.code : null;
    }
    
    // Create registry entry for the metal type (e.g., "gold", "silver")
    const metalRegistryType = `${metalTypeCode}_stock`;
    const stockValue = this.pcs ? this.totalValue : this.totalValue;
    
    if (stockValue > 0) {
      const registryEntry = new Registry({
        costCenter: finalCostCenterCode,
        type: metalRegistryType,
        description: `${description} - ${this.code} (${this.description})`,
        value: stockValue,
        credit: stockValue, // Credit for stock addition
        debit: 0,
        reference: this.code,
        createdBy: this.createdBy,
      });
      
      registryEntries.push(registryEntry);
    }

    // Create a general "stock" registry entry
    if (stockValue > 0) {
      const generalRegistryEntry = new Registry({
        costCenter: finalCostCenterCode,
        type: "stock",
        description: `${description} - ${this.code} (${this.description})`,
        value: stockValue,
        credit: stockValue, // Credit for stock addition
        debit: 0,
        reference: this.code,
        createdBy: this.createdBy,
      });
      
      registryEntries.push(generalRegistryEntry);
    }

    // Save all registry entries
    if (registryEntries.length > 0) {
      await Promise.all(registryEntries.map(entry => entry.save()));
    }

    return registryEntries;
  } catch (error) {
    console.error("Error creating registry entries:", error);
    throw error;
  }
};

// Static method to update stock with registry entries
MetalStockSchema.statics.updateStockWithRegistry = async function (stockId, stockData, transactionType, description, adminId, costCenterCode = null) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the metal stock
    const metalStock = await this.findById(stockId).session(session);
    if (!metalStock) {
      throw new Error("Metal stock not found");
    }

    // Store original values
    const originalPcsCount = metalStock.pcsCount;
    const originalTotalValue = metalStock.totalValue;

    // Update stock quantities
    if (metalStock.pcs) {
      // For piece-based stock
      if (stockData.pcsCount !== undefined) {
        metalStock.pcsCount += stockData.pcsCount;
      }
      if (stockData.totalValue !== undefined) {
        metalStock.totalValue += stockData.totalValue;
      }
    } else {
      // For weight-based stock
      if (stockData.quantity !== undefined) {
        metalStock.totalValue += stockData.quantity;
      }
    }

    metalStock.updatedBy = adminId;
    await metalStock.save({ session });

    // Create registry entries
    await metalStock.createRegistryEntries(transactionType, description, costCenterCode);

    await session.commitTransaction();
    
    return {
      metalStock,
      adjustedPcs: metalStock.pcsCount - originalPcsCount,
      adjustedValue: metalStock.totalValue - originalTotalValue,
      originalPcs: originalPcsCount,
      originalValue: originalTotalValue,
      newPcs: metalStock.pcsCount,
      newValue: metalStock.totalValue,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to check if code exists
MetalStockSchema.statics.isCodeExists = async function (
  code,
  excludeId = null
) {
  const query = { code: code.toUpperCase(), isActive: true };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return !!(await this.findOne(query));
};

const MetalStock = mongoose.model("MetalStock", MetalStockSchema);

export default MetalStock;