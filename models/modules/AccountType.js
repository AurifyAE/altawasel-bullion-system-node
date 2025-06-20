import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    // Basic Account Information
    accountType: {
      type: String,
      enum: {
        values: ["DEBTOR", "CREDITOR"],
        message: "Account type must be either 'DEBTOR' or 'CREDITOR'",
      },
      trim: true,
      default: null, // Set default to null explicitly
      required: [true, "Account type is required"]
    },    
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [10, "Title cannot exceed 10 characters"],
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
    classification: {
      type: String,
      default: null,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Remarks cannot exceed 500 characters"],
    },

    // Balance Information - UPDATED SECTION
    balances: {
      goldBalance: {
        totalGrams: {
          type: Number,
          default: 0,
          min: [0, "Gold balance cannot be negative"],
        },
        totalValue: {
          type: Number,
          default: 0,
          min: [0, "Gold value cannot be negative"],
        },
        currency: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CurrencyMaster",
          default: null,
        },
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
      cashBalance: {
        type: [{
          currency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CurrencyMaster",
            default: null,
          },
          amount: {
            type: Number,
            default: 0,
            // Allow negative for debit balances
          },
          lastUpdated: {
            type: Date,
            default: Date.now,
          },
        }],
        default: function() {
          return [{
            currency: null,
            amount: 0,
            lastUpdated: new Date()
          }];
        }
      },
      // Overall balance summary
      totalOutstanding: {
        type: Number,
        default: 0,
      },
      lastBalanceUpdate: {
        type: Date,
        default: Date.now,
      },
    },

    // A/C Definition Session
    acDefinition: {
      currencies: [
        {
          currency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CurrencyMaster",
            default: null,
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
        phoneNumber1: {
          type: String,
          default: null,
          trim: true,
          match: [/^[0-9]{10,15}$/, "Please enter a valid mobile number"],
        },
        phoneNumber2: {
          type: String,
          default: null,
          trim: true,
          match: [/^[0-9]{10,15}$/, "Please enter a valid mobile number"],
        },
        phoneNumber3: {
          type: String,
          default: null,
          trim: true,
          match: [/^[0-9]{10,15}$/, "Please enter a valid mobile number"],
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
        telephone: {
          type: String,
          default: null,
          trim: true,
          match: [/^[0-9]{10,15}$/, "Please enter a valid Telephone number"],
        },
        website: {
          type: String,
          default: null,
          trim: true,
          // match: [
          //   /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/,
          //   "Please enter a valid URL",
          // ],
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
          s3Key: String,
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
            s3Key: String,
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
AccountSchema.index({ accountCode: 1 });
AccountSchema.index({ customerName: 1 });
AccountSchema.index({ status: 1 });
AccountSchema.index({ isActive: 1 });
AccountSchema.index({ createdAt: -1 });
AccountSchema.index({ "employees.email": 1 });
AccountSchema.index({ "vatGstDetails.vatNumber": 1 });
// New indexes for balance queries
AccountSchema.index({ "balances.totalOutstanding": 1 });
AccountSchema.index({ "balances.goldBalance.totalGrams": 1 });

// UPDATED Pre-save middleware with cash balance handling
AccountSchema.pre("save", function (next) {
  if (this.accountCode) {
    this.accountCode = this.accountCode.toUpperCase();
  }

  // Ensure cash balance is initialized if empty or undefined
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    this.balances.cashBalance = [{
      currency: null,
      amount: 0,
      lastUpdated: new Date()
    }];
  }

  // Update balance timestamps when balances are modified
  if (this.isModified("balances")) {
    this.balances.lastBalanceUpdate = new Date();

    // Update individual balance timestamps
    if (this.balances.goldBalance && this.isModified("balances.goldBalance")) {
      this.balances.goldBalance.lastUpdated = new Date();
    }

    if (this.balances.cashBalance && this.isModified("balances.cashBalance")) {
      this.balances.cashBalance.forEach((balance) => {
        balance.lastUpdated = new Date();
      });
    }
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

// UPDATED Static method to check if account code exists
AccountSchema.statics.isAccountCodeExists = async function (
  accountCode,
  excludeId = null
) {
  const query = { accountCode: accountCode.toUpperCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const account = await this.findOne(query);
  return !!account;
};

// Static method to get active accounts
AccountSchema.statics.getActiveAccounts = function () {
  return this.find({ isActive: true, status: "active" });
};

// Static method to get accounts with outstanding balances
AccountSchema.statics.getAccountsWithOutstanding = function (
  minAmount = 0
) {
  return this.find({
    isActive: true,
    status: "active",
    "balances.totalOutstanding": { $gt: minAmount },
  });
};

// Static method to get total gold balance across all accounts
AccountSchema.statics.getTotalGoldBalance = async function () {
  const result = await this.aggregate([
    { $match: { isActive: true, status: "active" } },
    {
      $group: {
        _id: null,
        totalGrams: { $sum: "$balances.goldBalance.totalGrams" },
        totalValue: { $sum: "$balances.goldBalance.totalValue" },
      },
    },
  ]);
  return result[0] || { totalGrams: 0, totalValue: 0 };
};

// NEW Static method to get total cash balance across all accounts
AccountSchema.statics.getTotalCashBalance = async function (currencyId = null) {
  const matchStage = { isActive: true, status: "active" };
  
  if (currencyId) {
    matchStage["balances.cashBalance.currency"] = currencyId;
  }

  const result = await this.aggregate([
    { $match: matchStage },
    { $unwind: "$balances.cashBalance" },
    ...(currencyId ? [{ $match: { "balances.cashBalance.currency": currencyId } }] : []),
    {
      $group: {
        _id: currencyId ? currencyId : "$balances.cashBalance.currency",
        totalAmount: { $sum: "$balances.cashBalance.amount" },
        count: { $sum: 1 }
      },
    },
  ]);
  
  return result;
};

// Instance method to get primary contact
AccountSchema.methods.getPrimaryContact = function () {
  return this.employees.find((emp) => emp.isPrimary) || this.employees[0];
};

// Instance method to get primary address
AccountSchema.methods.getPrimaryAddress = function () {
  return this.addresses.find((addr) => addr.isPrimary) || this.addresses[0];
};

// Instance method to get primary bank
AccountSchema.methods.getPrimaryBank = function () {
  return this.bankDetails.find((bank) => bank.isPrimary) || this.bankDetails[0];
};

// Instance method to update gold balance
AccountSchema.methods.updateGoldBalance = function (
  grams,
  value,
  currency = null
) {
  this.balances.goldBalance.totalGrams = grams;
  this.balances.goldBalance.totalValue = value;
  if (currency) {
    this.balances.goldBalance.currency = currency;
  }
  this.balances.goldBalance.lastUpdated = new Date();
  this.balances.lastBalanceUpdate = new Date();
  return this.save();
};

// UPDATED Instance method to update cash balance for a specific currency
AccountSchema.methods.updateCashBalance = function (currencyId, amount) {
  // Ensure cashBalance array exists and has at least one entry
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    this.balances.cashBalance = [{
      currency: currencyId,
      amount: amount,
      lastUpdated: new Date()
    }];
  } else {
    const existingBalance = this.balances.cashBalance.find(
      (balance) => balance.currency && balance.currency.toString() === currencyId.toString()
    );

    if (existingBalance) {
      existingBalance.amount = amount;
      existingBalance.lastUpdated = new Date();
    } else {
      this.balances.cashBalance.push({
        currency: currencyId,
        amount: amount,
        lastUpdated: new Date(),
      });
    }
  }

  this.balances.lastBalanceUpdate = new Date();
  return this.save();
};

// UPDATED Instance method to get cash balance for a specific currency
AccountSchema.methods.getCashBalance = function (currencyId) {
  // Ensure cashBalance array exists
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    return 0;
  }

  if (!currencyId) {
    // Return the first cash balance if no currency specified
    return this.balances.cashBalance[0].amount || 0;
  }

  const balance = this.balances.cashBalance.find(
    (balance) => balance.currency && balance.currency.toString() === currencyId.toString()
  );
  return balance ? balance.amount : 0;
};

// NEW Instance method to get all cash balances
AccountSchema.methods.getAllCashBalances = function () {
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    return [{
      currency: null,
      amount: 0,
      lastUpdated: new Date()
    }];
  }
  return this.balances.cashBalance;
};

// UPDATED Instance method to calculate total outstanding
AccountSchema.methods.calculateTotalOutstanding = function () {
  // Ensure cashBalance exists
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    this.balances.totalOutstanding = this.balances.goldBalance.totalValue || 0;
    return this.balances.totalOutstanding;
  }

  // Sum up cash balances
  const totalCash = this.balances.cashBalance.reduce((sum, balance) => {
    return sum + (balance.amount || 0);
  }, 0);

  this.balances.totalOutstanding =
    totalCash + (this.balances.goldBalance.totalValue || 0);
  return this.balances.totalOutstanding;
};

// NEW Instance method to add new currency to cash balance
AccountSchema.methods.addCurrencyBalance = function (currencyId, amount = 0) {
  if (!this.balances.cashBalance) {
    this.balances.cashBalance = [];
  }

  // Check if currency already exists
  const existingBalance = this.balances.cashBalance.find(
    (balance) => balance.currency && balance.currency.toString() === currencyId.toString()
  );

  if (!existingBalance) {
    this.balances.cashBalance.push({
      currency: currencyId,
      amount: amount,
      lastUpdated: new Date(),
    });
    this.balances.lastBalanceUpdate = new Date();
  }

  return this.save();
};

// NEW Instance method to remove currency from cash balance
AccountSchema.methods.removeCurrencyBalance = function (currencyId) {
  if (!this.balances.cashBalance || this.balances.cashBalance.length === 0) {
    return this;
  }

  this.balances.cashBalance = this.balances.cashBalance.filter(
    (balance) => !balance.currency || balance.currency.toString() !== currencyId.toString()
  );

  // Ensure at least one cash balance entry exists
  if (this.balances.cashBalance.length === 0) {
    this.balances.cashBalance = [{
      currency: null,
      amount: 0,
      lastUpdated: new Date()
    }];
  }

  this.balances.lastBalanceUpdate = new Date();
  return this.save();
};

const Account = mongoose.model("Account", AccountSchema);

export default Account;