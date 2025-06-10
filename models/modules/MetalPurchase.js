import mongoose from "mongoose";

const MetalPurchaseSchema = new mongoose.Schema(
  {
    // Basic Purchase Information
    fixed: {
      type: Boolean,
      default: false,
    },
    unfix: {
      type: Boolean,
      default: false,
    },
    voucherType: {
      type: String,
      trim: true,
      default: null,
      maxlength: [50, "Voucher type cannot exceed 50 characters"],
    },
    voucherDate: {
      type: Date,
      default: null,
    },

    // Party Information
    partyCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TradeDebtors",
      required: [true, "Party Code is required"],
    },
    partyCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurrencyMaster",
      required: [true, "Party Currency is required"],
    },
    itemCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurrencyMaster",
      default: null,
    },
    subLedger: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, "Sub Ledger cannot exceed 100 characters"],
    },

    // Metal and Rate Information
    metalRate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetalRateMaster",
      required: [true, "Metal Rate is required"],
    },
    crDays: {
      type: Number,
      default: 0,
      min: [0, "CR Days cannot be negative"],
    },
    creditDays: {
      type: Number,
      default: 0,
      min: [0, "Credit Days cannot be negative"],
    },
    baseCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurrencyMaster",
      default: null,
    },

    // Stock Information
    stockCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetalStock",
      required: [true, "Stock Code is required"],
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    pieces: {
      type: Number,
      default: 0,
      min: [0, "Pieces cannot be negative"],
    },
    grossWeight: {
      type: Number,
      default: 0,

      min: [0, "Gross Weight cannot be negative"],
    },
    purity: {
      type: Number,
      required: [true, "Purity is required"],
      min: [0, "Purity cannot be negative"],
      max: [100, "Purity cannot exceed 100%"],
    },
    purityWeight: {
      type: Number,
      required: [true, "Purity Weight is required"],
      min: [0, "Purity Weight cannot be negative"],
    },
    weightInOz: {
      type: Number,
      required: [true, "Weight in Oz is required"],
      min: [0, "Weight in Oz cannot be negative"],
    },
    purityDiff: {
      type: Number,
      default: 0,
    },

    // Metal Rate & Requirements
    metalRateRequirements: {
      rateType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MetalRateMaster",
        required: [true, "Rate Type is required"],
      },
      rate: {
        type: Number,
        default: 0,
        min: [0, "Rate cannot be negative"],
      },
      amount: {
        type: Number,
        default: 0,
        min: [0, "Amount cannot be negative"],
      },
    },

    // Making Charges
    makingCharges: {
      units: {
        type: Number,
        default: 0,
        min: [0, "Units cannot be negative"],
      },
      rate: {
        type: Number,
        default: 0,
        min: [0, "Rate cannot be negative"],
      },
      amount: {
        type: Number,
        default: 0,
        min: [0, "Amount cannot be negative"],
      },
    },

    // Premium
    premium: {
      currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CurrencyMaster",
        default: null,
      },
      amount: {
        type: Number,
        default: 0,
      },
      rate: {
        type: Number,
        default: 0,
        
      },
    },

    // Total Amount Session
    totalAmountSession: {
      totalAmountAED: {
        type: Number,
        default: 0,
        min: [0, "Total Amount cannot be negative"],
      },
      netAmountAED: {
        type: Number,
        default: 0,
        min: [0, "Net Amount cannot be negative"],
      },
      vatAmount: {
        type: Number,
        default: 0,
        min: [0, "VAT Amount cannot be negative"],
      },
      vatPercentage: {
        type: Number,
        default: 0,
        min: [0, "VAT Percentage cannot be negative"],
        max: [100, "VAT Percentage cannot exceed 100%"],
      },
    },

    // Status and Tracking
    status: {
      type: String,
      enum: ["draft", "confirmed", "completed", "cancelled"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
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
MetalPurchaseSchema.index({ partyCode: 1 });
MetalPurchaseSchema.index({ stockCode: 1 });
MetalPurchaseSchema.index({ metalRate: 1 });
MetalPurchaseSchema.index({ voucherDate: -1 });
MetalPurchaseSchema.index({ status: 1 });
MetalPurchaseSchema.index({ isActive: 1 });
MetalPurchaseSchema.index({ createdAt: -1 });
MetalPurchaseSchema.index({ partyCode: 1, voucherDate: -1 });

// Virtual for formatted voucher date
MetalPurchaseSchema.virtual("formattedVoucherDate").get(function () {
  if (!this.voucherDate) return null;
  return this.voucherDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});


// Static method to get purchases by party
MetalPurchaseSchema.statics.getPurchasesByParty = async function (
  partyId,
  limit = 50
) {
  return this.find({ partyCode: partyId, isActive: true })
    .sort({ voucherDate: -1, createdAt: -1 })
    .limit(limit)
    .populate("partyCode", "name code")
    .populate("partyCurrency", "code symbol")
    .populate("itemCurrency", "code symbol")
    .populate("stockCode", "code description")
    .populate("metalRate", "metalType rate")
    .populate("createdBy", "name email");
};

// Static method to get purchases by date range
MetalPurchaseSchema.statics.getPurchasesByDateRange = async function (
  startDate,
  endDate,
  limit = 100
) {
  return this.find({
    voucherDate: {
      $gte: startDate,
      $lte: endDate,
    },
    isActive: true,
  })
    .sort({ voucherDate: -1 })
    .limit(limit)
    .populate("partyCode", "name code")
    .populate("stockCode", "code description");
};

// Static method to get purchase statistics
MetalPurchaseSchema.statics.getPurchaseStats = async function (partyId = null) {
  const matchCondition = { isActive: true, status: "completed" };
  if (partyId) {
    matchCondition.partyCode = new mongoose.Types.ObjectId(partyId);
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
        totalWeight: { $sum: "$purityWeight" },
        avgPurchaseValue: { $avg: "$totalAmountSession.totalAmountAED" },
      },
    },
  ]);
};

const MetalPurchase = mongoose.model("MetalPurchase", MetalPurchaseSchema);
export default MetalPurchase;
