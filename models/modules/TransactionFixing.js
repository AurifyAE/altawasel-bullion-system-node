import mongoose from "mongoose";

const TransactionFixingSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    voucherType: {
      type: String,
      trim: true,
      default: null,
      maxlength: [50, "Voucher type cannot exceed 50 characters"],
    },
    voucherDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    voucherNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Voucher number cannot exceed 50 characters"],
      index: true,
      // Allow null values but enforce uniqueness when present
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account", // Assuming you have a PartyMaster model
      required: [true, "Party ID is required"],
    },
    quantityGm: {
      type: Number,
      required: [true, "Quantity in grams is required"],
      min: [0, "Quantity cannot be negative"],
    },
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price cannot be negative"],
    },
    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: ["purchase", "sell"],
        message: "Type must be either 'purchase' or 'sell'",
      },
      lowercase: true,
    },
    metalType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetalRateMaster", // Assuming you have a PartyMaster model
      required: [true, "MetalRateMaster ID is required"],
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      default: () => new Date(),
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
      uppercase: true,
      maxlength: [20, "Reference number cannot exceed 20 characters"],
    },
    notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
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
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
TransactionFixingSchema.index({ transactionId: 1 }, { unique: true });
TransactionFixingSchema.index({ partyId: 1 });
TransactionFixingSchema.index({ type: 1 });
TransactionFixingSchema.index({ metalType: 1 });
TransactionFixingSchema.index({ transactionDate: -1 });
TransactionFixingSchema.index({ status: 1 });
TransactionFixingSchema.index({ isActive: 1 });
TransactionFixingSchema.index({ createdAt: -1 });
TransactionFixingSchema.index({ partyId: 1, transactionDate: -1 });
TransactionFixingSchema.index({ metalType: 1, transactionDate: -1 });

// Pre-save middleware
TransactionFixingSchema.pre("save", async function (next) {
  // Generate transaction ID if not provided
  if (!this.transactionId) {
    this.transactionId = await generateTransactionId(this.type);
  }


  if (this.referenceNumber) {
    this.referenceNumber = this.referenceNumber.toUpperCase();
  }

  next();
});

// Function to generate transaction ID with random 5-digit number
async function generateTransactionId(type) {
  const prefix = type === "purchase" ? "PUR" : "SELL";
  let isUnique = false;
  let transactionId;

  // Keep generating until we get a unique ID
  while (!isUnique) {
    const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit random number
    transactionId = `${prefix}${randomNum}`;

    // Check if this ID already exists
    const existingTransaction = await mongoose
      .model("TransactionFixing")
      .findOne({ transactionId });
    if (!existingTransaction) {
      isUnique = true;
    }
  }

  return transactionId;
}

// Static method to get transactions by party
TransactionFixingSchema.statics.getTransactionsByParty = async function (
  partyId,
  startDate = null,
  endDate = null
) {
  const query = { partyId, status: "active" };

  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
  }

  return await this.find(query).sort({ transactionDate: -1 });
};




const TransactionFixing = mongoose.model(
  "TransactionFixing",
  TransactionFixingSchema
);
export default TransactionFixing;
