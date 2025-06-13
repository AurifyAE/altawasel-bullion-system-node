import mongoose from "mongoose";
import moment from "moment";

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
      uppercase: true
    },
    prefix: {
      type: String,
      required: [true, "Voucher prefix is required"],
      trim: true,
      uppercase: true,
      maxlength: [10, "Prefix cannot exceed 10 characters"],
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
      enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DDMMYYYY", "MMDDYYYY", "YYYYMMDD"],
      default: "DD/MM/YYYY"
    },
    includeDateInNumber: {
      type: Boolean,
      default: false
    },
    isAutoIncrement: {
      type: Boolean,
      default: true
    },
    resetCounterOn: {
      type: String,
      enum: ["NEVER", "DAILY", "MONTHLY", "YEARLY"],
      default: "NEVER"
    },
    lastResetDate: {
      type: Date,
      default: null
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
VoucherMasterSchema.index({ voucherType: 1, status: 1, isActive: 1 });

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

// Static method to check if counter needs reset
VoucherMasterSchema.methods.shouldResetCounter = function() {
  if (this.resetCounterOn === "NEVER" || !this.lastResetDate) {
    return false;
  }

  const now = moment();
  const lastReset = moment(this.lastResetDate);

  switch (this.resetCounterOn) {
    case "DAILY":
      return !now.isSame(lastReset, 'day');
    case "MONTHLY":
      return !now.isSame(lastReset, 'month');
    case "YEARLY":
      return !now.isSame(lastReset, 'year');
    default:
      return false;
  }
};

// Static method to generate next voucher number with proper sequencing
VoucherMasterSchema.statics.generateVoucherNumber = async function(voucherId, customDate = null) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const voucher = await this.findById(voucherId).session(session);
    if (!voucher) {
      throw new Error("Voucher configuration not found");
    }

    // Check if counter needs reset
    if (voucher.shouldResetCounter()) {
      voucher.nextNumber = 1;
      voucher.lastResetDate = new Date();
    }

    const currentDate = customDate ? moment(customDate) : moment();
    let voucherNumber = voucher.prefix;

    // Add date to voucher number if required
    if (voucher.includeDateInNumber) {
      let dateString = "";
      switch (voucher.dateFormat) {
        case "DD/MM/YYYY":
          dateString = currentDate.format("DDMMYYYY");
          break;
        case "MM/DD/YYYY":
          dateString = currentDate.format("MMDDYYYY");
          break;
        case "YYYY-MM-DD":
          dateString = currentDate.format("YYYYMMDD");
          break;
        case "DDMMYYYY":
          dateString = currentDate.format("DDMMYYYY");
          break;
        case "MMDDYYYY":
          dateString = currentDate.format("MMDDYYYY");
          break;
        case "YYYYMMDD":
          dateString = currentDate.format("YYYYMMDD");
          break;
        default:
          dateString = currentDate.format("DDMMYYYY");
      }
      voucherNumber += dateString;
    }

    // Add padded sequence number
    const paddedNumber = String(voucher.nextNumber).padStart(voucher.numberLength, '0');
    voucherNumber += paddedNumber;

    // Increment next number if auto increment is enabled
    if (voucher.isAutoIncrement) {
      voucher.nextNumber += 1;
      await voucher.save({ session });
    }

    await session.commitTransaction();
    return {
      voucherNumber,
      sequence: voucher.nextNumber - 1,
      formattedDate: currentDate.format(voucher.dateFormat)
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to get next voucher number without incrementing
VoucherMasterSchema.statics.getNextVoucherNumber = async function(voucherId, customDate = null) {
  const voucher = await this.findById(voucherId);
  if (!voucher) {
    throw new Error("Voucher configuration not found");
  }

  const currentDate = customDate ? moment(customDate) : moment();
  let nextNumber = voucher.nextNumber;

  // Check if counter needs reset
  if (voucher.shouldResetCounter()) {
    nextNumber = 1;
  }

  let voucherNumber = voucher.prefix;

  // Add date to voucher number if required
  if (voucher.includeDateInNumber) {
    let dateString = "";
    switch (voucher.dateFormat) {
      case "DD/MM/YYYY":
        dateString = currentDate.format("DDMMYYYY");
        break;
      case "MM/DD/YYYY":
        dateString = currentDate.format("MMDDYYYY");
        break;
      case "YYYY-MM-DD":
        dateString = currentDate.format("YYYYMMDD");
        break;
      case "DDMMYYYY":
        dateString = currentDate.format("DDMMYYYY");
        break;
      case "MMDDYYYY":
        dateString = currentDate.format("MMDDYYYY");
        break;
      case "YYYYMMDD":
        dateString = currentDate.format("YYYYMMDD");
        break;
      default:
        dateString = currentDate.format("DDMMYYYY");
    }
    voucherNumber += dateString;
  }

  // Add padded sequence number
  const paddedNumber = String(nextNumber).padStart(voucher.numberLength, '0');
  voucherNumber += paddedNumber;

  return {
    voucherNumber,
    sequence: nextNumber,
    formattedDate: currentDate.format(voucher.dateFormat)
  };
};

const VoucherMaster = mongoose.model("VoucherMaster", VoucherMasterSchema);
export default VoucherMaster;