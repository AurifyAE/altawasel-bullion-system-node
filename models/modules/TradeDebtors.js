import mongoose from "mongoose";

const TradeDebtorsSchema = new mongoose.Schema(
  {
    // Basic Account Information
    accountType: {
      type: String,
      required: [true, "Account type is required"],
      trim: true,
      default: "Account",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [10, "Title cannot exceed 10 characters"],
    },
    mode: {
      type: String,
      required: [true, "Mode is required"],
      trim: true,
      default: "DEBTOR",
    },
    accountCode: {
      type: String,
      required: [true, "Account code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "Account code cannot exceed 20 characters"],
      match: [
        /^[A-Z0-9]+$/,
        "Account code should contain only uppercase letters and numbers",
      ],
    },
    customerName: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, "Customer name cannot exceed 100 characters"],
    },
    parentGroup: {
      type: String,
      default: null,
      trim: true,
      maxlength: [50, "Parent group cannot exceed 50 characters"],
    },
    classification: {
      type: String,
      default: null,
      trim: true,
    },
    shortName: {
      type: String,
      default: null,
      trim: true,
      maxlength: [20, "Short name cannot exceed 20 characters"],
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Remarks cannot exceed 500 characters"],
    },

    // A/C Definition Session
    acDefinition: {
      currencies: [
        {
          currency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CurrencyMaster",
            required: true,
          },
          isDefault: {
            type: Boolean,
            default: false,
          },
        },
      ],
      branches: [
        {
          branch: {
            type: mongoose.Schema.Types.ObjectId,
            // ref: "BranchMaster",
            default: null,
          },
          isDefault: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },

    // Limits & Margins Session
    limitsMargins: [
      {
        limitType: {
          type: String,
          default: null,
          trim: true,
        },
        currency: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CurrencyMaster",
          required: true,
        },
        unfixGoldGms: {
          type: Number,
          min: [0, "Unfix Gold Gms cannot be negative"],
          default: 0,
        },
        netAmountLC: {
          type: Number,
          min: [0, "Net Amount (LC) cannot be negative"],
          default: 0,
        },
        creditDaysAmt: {
          type: Number,
          min: [0, "Credit Days Amount cannot be negative"],
          default: 0,
        },
        creditDaysMtl: {
          type: Number,
          min: [0, "Credit Days Material cannot be negative"],
          default: 0,
        },
        shortMargin: {
          type: Number,
          min: [0, "Short Margin cannot be negative"],
          max: [100, "Short Margin cannot exceed 100%"],
          default: 0,
        },
        longMargin: {
          type: Number,
          min: [0, "Long Margin cannot be negative"],
          max: [100, "Long Margin cannot exceed 100%"],
          default: 0,
        },
      },
    ],

    // Address Details Session
    addresses: [
      {
        streetAddress: {
          type: String,
          default: null,
          trim: true,
          maxlength: [200, "Street address cannot exceed 200 characters"],
        },
        city: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "City cannot exceed 50 characters"],
        },
        country: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "Country cannot exceed 50 characters"],
        },
        zipCode: {
          type: String,
          default: null,
          trim: true,
          maxlength: [20, "Zip code cannot exceed 20 characters"],
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Employee Details
    employees: [
      {
        name: {
          type: String,
          default: null,
          trim: true,
          maxlength: [100, "Employee name cannot exceed 100 characters"],
        },
        designation: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "Designation cannot exceed 50 characters"],
        },
        email: {
          type: String,
          default: null,
          trim: true,
          lowercase: true,
          match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please enter a valid email",
          ],
        },
        mobile: {
          type: String,
          default: null,
          trim: true,
          match: [/^[0-9]{10,15}$/, "Please enter a valid mobile number"],
        },
        poAlert: {
          type: Boolean,
          default: false,
        },
        soAlert: {
          type: Boolean,
          default: false,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // VAT/GST Details
    vatGstDetails: {
      vatStatus: {
        type: String,
        enum: ["REGISTERED", "UNREGISTERED", "EXEMPTED"],
        default: "UNREGISTERED",
      },
      vatNumber: {
        type: String,
        trim: true,
        maxlength: [50, "VAT number cannot exceed 50 characters"],
      },
      documents: [
        {
          fileName: String,
          filePath: String,
          fileType: String,
          s3Key:String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
          default: [],
        },
      ],
    },

    // Bank Details Session
    bankDetails: [
      {
        bankName: {
          type: String,
          default: null,
          trim: true,
          maxlength: [100, "Bank name cannot exceed 100 characters"],
        },
        swiftId: {
          type: String,
          trim: true,
          default: null,
          uppercase: true,
          maxlength: [20, "SWIFT ID cannot exceed 20 characters"],
        },
        iban: {
          type: String,
          trim: true,
          default: null,
          uppercase: true,
          maxlength: [50, "IBAN cannot exceed 50 characters"],
        },
        accountNumber: {
          type: String,
          default: null,
          trim: true,
          maxlength: [30, "Account number cannot exceed 30 characters"],
        },
        branchCode: {
          type: String,
          trim: true,
          default: null,
          maxlength: [20, "Branch code cannot exceed 20 characters"],
        },
        purpose: {
          type: String,
          default: null,
        },
        country: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "Country cannot exceed 50 characters"],
        },
        city: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "City cannot exceed 50 characters"],
        },
        routingCode: {
          type: String,
          trim: true,
          default: null,
          maxlength: [20, "Routing code cannot exceed 20 characters"],
        },
        address: {
          type: String,
          trim: true,
          default: null,
          maxlength: [200, "Address cannot exceed 200 characters"],
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // KYC Details Session
    kycDetails: [
      {
        documentType: {
          type: String,
          default: null,
          trim: true,
        },
        documentNumber: {
          type: String,
          default: null,
          trim: true,
          maxlength: [50, "Document number cannot exceed 50 characters"],
        },
        issueDate: {
          type: Date,
          default: null,

          required: [true, "Issue date is required"],
        },
        expiryDate: {
          type: Date,
          default: null,
          validate: {
            validator: function (value) {
              return value > this.issueDate;
            },
            message: "Expiry date must be after issue date",
          },
        },
        documents: [
          {
            fileName: String,
            filePath: String,
            fileType: String,
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
            default: [],
          },
        ],
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Status and Activity
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
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
TradeDebtorsSchema.index({ accountCode: 1 });
TradeDebtorsSchema.index({ customerName: 1 });
TradeDebtorsSchema.index({ status: 1 });
TradeDebtorsSchema.index({ isActive: 1 });
TradeDebtorsSchema.index({ createdAt: -1 });
TradeDebtorsSchema.index({ "employees.email": 1 });
TradeDebtorsSchema.index({ "vatGstDetails.vatNumber": 1 });

// Pre-save middleware to ensure uppercase codes
TradeDebtorsSchema.pre("save", function (next) {
  if (this.accountCode) {
    this.accountCode = this.accountCode.toUpperCase();
  }

  // Ensure only one primary address
  if (this.addresses && this.addresses.length > 0) {
    const primaryAddresses = this.addresses.filter((addr) => addr.isPrimary);
    if (primaryAddresses.length > 1) {
      this.addresses.forEach((addr, index) => {
        if (index > 0) addr.isPrimary = false;
      });
    }
  }

  // Ensure only one primary employee
  if (this.employees && this.employees.length > 0) {
    const primaryEmployees = this.employees.filter((emp) => emp.isPrimary);
    if (primaryEmployees.length > 1) {
      this.employees.forEach((emp, index) => {
        if (index > 0) emp.isPrimary = false;
      });
    }
  }

  // Ensure only one primary bank
  if (this.bankDetails && this.bankDetails.length > 0) {
    const primaryBanks = this.bankDetails.filter((bank) => bank.isPrimary);
    if (primaryBanks.length > 1) {
      this.bankDetails.forEach((bank, index) => {
        if (index > 0) bank.isPrimary = false;
      });
    }
  }

  next();
});

// Static method to check if account code exists
TradeDebtorsSchema.statics.isAccountCodeExists = async function (
  accountCode,
  excludeId = null
) {
  const query = { accountCode: accountCode.toUpperCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const debtor = await this.findOne(query);
  return !!debtor;
};

// Static method to get active debtors
TradeDebtorsSchema.statics.getActiveDebtors = function () {
  return this.find({ isActive: true, status: "active" });
};

// Instance method to get primary contact
TradeDebtorsSchema.methods.getPrimaryContact = function () {
  return this.employees.find((emp) => emp.isPrimary) || this.employees[0];
};

// Instance method to get primary address
TradeDebtorsSchema.methods.getPrimaryAddress = function () {
  return this.addresses.find((addr) => addr.isPrimary) || this.addresses[0];
};

// Instance method to get primary bank
TradeDebtorsSchema.methods.getPrimaryBank = function () {
  return this.bankDetails.find((bank) => bank.isPrimary) || this.bankDetails[0];
};

const TradeDebtors = mongoose.model("TradeDebtors", TradeDebtorsSchema);

export default TradeDebtors;
