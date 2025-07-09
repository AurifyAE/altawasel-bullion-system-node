import mongoose from "mongoose";
import MetalTransaction from "../../models/modules/MetalTransaction.js";
import Registry from "../../models/modules/Registry.js";
import Account from "../../models/modules/AccountType.js";
import { createAppError } from "../../utils/errorHandler.js";

class MetalTransactionService {
  // Create a new metal transaction

  static async createMetalTransaction(transactionData, adminId) {
    const session = await mongoose.startSession();
    let createdTransaction;

    try {
      await session.withTransaction(async () => {
        // Validate party and create transaction in parallel
        const [party, metalTransaction] = await Promise.all([
          this.validateParty(transactionData.partyCode, session),
          this.createTransaction(transactionData, adminId),
        ]);

        // Save transaction
        await metalTransaction.save({ session });
        createdTransaction = metalTransaction;

        // Process registry entries and balance updates in parallel
        await Promise.all([
          this.createRegistryEntries(metalTransaction, party, adminId, session),
          this.updateAccountBalances(party, metalTransaction, session),
        ]);

        return metalTransaction;
      });

      // Return populated transaction
      return await this.getMetalTransactionById(createdTransaction._id);
    } catch (error) {
      throw this.handleError(error);
    } finally {
      await session.endSession();
    }
  }

  // Optimized party validation
  static async validateParty(partyCode, session) {
    const party = await Account.findById(partyCode)
      .select("_id isActive accountCode customerName balances")
      .session(session)
      .lean();

    if (!party?.isActive) {
      throw createAppError("Party not found or inactive", 400, "INVALID_PARTY");
    }
    return party;
  }

  // Optimized transaction creation
  static createTransaction(transactionData, adminId) {
    const transaction = new MetalTransaction({
      ...transactionData,
      createdBy: adminId,
    });

    // Calculate totals if needed
    if (!transactionData.totalAmountSession?.totalAmountAED) {
      transaction.calculateSessionTotals();
    }

    return transaction;
  }

  // Registry entries creation with optimized logic
  static async createRegistryEntries(
    metalTransaction,
    party,
    adminId,
    session
  ) {
    const entries = this.buildRegistryEntries(metalTransaction, party, adminId);

    if (entries.length === 0) return [];

    // Bulk insert with session
    return await Registry.insertMany(entries, { session, ordered: false });
  }

  // Build registry entries based on transaction type and fix/unfix flags
  static buildRegistryEntries(metalTransaction, party, adminId) {
    const {
      transactionType,
      _id,
      fixed,
      unfix,
      stockItems,
      totalAmountSession,
      voucherDate,
      voucherNumber,
    } = metalTransaction;

    // Pre-calculate totals from stock items
    const totals = this.calculateTotals(stockItems, totalAmountSession);
    const baseTransactionId = this.generateTransactionId();

    // Determine transaction mode
    const mode = this.getTransactionMode(fixed, unfix);

    console.log(
      `Processing ${transactionType.toUpperCase()} ${mode.toUpperCase()} transaction`
    );

    // Build entries based on transaction type and mode
    const entries = [];

    if (transactionType === "purchase") {
      entries.push(
        ...this.buildPurchaseEntries(
          mode,
          _id,
          totals,
          party,
          baseTransactionId,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    } else if (transactionType === "sale") {
      entries.push(
        ...this.buildSaleEntries(
          mode,
          _id,
          totals,
          party,
          baseTransactionId,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    return entries.filter((entry) => entry && entry.value > 0);
  }

  // Determine transaction mode based on fix/unfix flags
  static getTransactionMode(fixed, unfix) {
    console.log("============================");
    console.log(fixed);
    console.log(unfix);
    if (fixed && !unfix) return "fix";
    if (unfix && !fixed) return "unfix";
    if (!fixed && !unfix) return "unfix"; // Default to unfix
    if (fixed && unfix) return "fix"; // Prioritize fix when both are true
  }

  // Build purchase entries based on mode
  static buildPurchaseEntries(
    mode,
    metalTransactionId,
    totals,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    return mode === "fix"
      ? this.buildPurchaseFixEntries(
        totals,
        metalTransactionId,
        party,
        baseTransactionId,
        voucherDate,
        voucherNumber,
        adminId
      )
      : this.buildPurchaseUnfixEntries(
        totals,
        metalTransactionId,
        party,
        baseTransactionId,
        voucherDate,
        voucherNumber,
        adminId
      );
  }

  // Build sale entries based on mode
  static buildSaleEntries(
    mode,
    metalTransactionId,
    totals,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    return mode === "fix"
      ? this.buildSaleFixEntries(
        totals,
        metalTransactionId,
        party,
        baseTransactionId,
        voucherDate,
        voucherNumber,
        adminId
      )
      : this.buildSaleUnfixEntries(
        totals,
        metalTransactionId,
        party,
        baseTransactionId,
        voucherDate,
        voucherNumber,
        adminId
      );
  }

  // Calculate totals from stock items (FIXED - Premium/Discount handling)
  static calculateTotals(stockItems, totalAmountSession) {
    const totals = stockItems.reduce(
      (acc, item) => {
        const makingChargesAmount =
          item.itemTotal?.makingChargesTotal || item.makingCharges?.amount || 0;

        // Handle premium/discount - positive = premium, negative = discount
        const premiumDiscountAmount =
          item.itemTotal?.premiumTotal || item.premium?.amount || 0;

        const goldValue = item.itemTotal?.baseAmount || 0;
        const pureWeight = item.pureWeight || 0;
        const grossWeight = item.grossWeight || 0;
        // Separate premium and discount
        const premium = premiumDiscountAmount > 0 ? premiumDiscountAmount : 0;
        const discount =
          premiumDiscountAmount < 0 ? Math.abs(premiumDiscountAmount) : 0;

        return {
          makingCharges: acc.makingCharges + makingChargesAmount,
          premium: acc.premium + premium,
          discount: acc.discount + discount,
          goldValue: acc.goldValue + goldValue,
          pureWeight: acc.pureWeight + pureWeight,
          grossWeight: acc.grossWeight + grossWeight,
        };
      },
      { makingCharges: 0, premium: 0, discount: 0, goldValue: 0, pureWeight: 0, grossWeight: 0 }
    );

    totals.totalAmount = totalAmountSession?.totalAmountAED || 0;

    console.log("=== CALCULATED TOTALS ===", {
      makingCharges: totals.makingCharges,
      premium: totals.premium,
      discount: totals.discount,
      goldValue: totals.goldValue,
      pureWeight: totals.pureWeight,
      totalAmount: totals.totalAmount,
      grossWeight: totals.grossWeight
    });

    return totals;
  }

  // PURCHASE UNFIX - Registry entries (FIXED)
  static buildPurchaseUnfixEntries(
    totals,
    metalTransactionId,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    const entries = [];
    const partyName = party.customerName || party.accountCode;

    // Party Gold Balance - CREDIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "001",
          "PARTY_GOLD_BALANCE",
          `Purchase Unfix - Gold balance credited for ${partyName}: ${totals.pureWeight}g`,
          party._id,
          false,
          totals.pureWeight,
          totals.pureWeight,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Making Charges - CREDIT
    if (totals.makingCharges > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "003",
          "MAKING_CHARGES",
          `Purchase Unfix - Making charges credited:  ${totals.makingCharges}`,
          party._id,
          false,
          totals.makingCharges,
          totals.makingCharges,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Premium - CREDIT (if positive)
    if (totals.premium > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "004",
          "PREMIUM",
          `Purchase Unfix - Premium credited:  ${totals.premium}`,
          party._id,
          false,
          totals.premium,
          totals.premium,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Discount - DEBIT (if exists)
    if (totals.discount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "007",
          "DISCOUNT",
          `Purchase Unfix - Discount debited:  ${totals.discount}`,
          party._id,
          false,
          totals.discount,
          0,
          totals.discount,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Inventory - DEBIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "005",
          "GOLD",
          `Purchase Unfix - Gold inventory debited: ${totals.pureWeight}g`,
          null,
          true,
          totals.pureWeight,
          0,
          totals.pureWeight,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Stock - DEBIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "006",
          "GOLD_STOCK",
          `Purchase Unfix - Gold stock debited: ${totals.pureWeight}g`,
          null,
          true,
          totals.grossWeight,
          0,
          totals.grossWeight,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    return entries;
  }

  // PURCHASE FIX - Registry entries (FIXED)
  static buildPurchaseFixEntries(
    totals,
    metalTransactionId,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    const entries = [];
    const partyName = party.customerName || party.accountCode;
    // Party Cash Balance - CREDIT (total amount only)
    if (totals.totalAmount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "001",
          "PARTY_CASH_BALANCE",
          `Purchase Fix - Cash balance credited for ${partyName}: AED ${totals.totalAmount}`,
          party._id,
          false,
          totals.totalAmount,
          totals.totalAmount,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Making Charges - CREDIT
    if (totals.makingCharges > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "002",
          "MAKING_CHARGES",
          `Purchase Fix - Making charges credited:  ${totals.makingCharges}`,
          party._id,
          false,
          totals.makingCharges,
          totals.makingCharges,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Premium - CREDIT (if positive)
    if (totals.premium > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "003",
          "PREMIUM",
          `Purchase Fix - Premium credited:  ${totals.premium}`,
          party._id,
          false,
          totals.premium,
          totals.premium,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Discount - DEBIT (if exists)
    if (totals.discount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "007",
          "DISCOUNT",
          `Purchase Fix - Discount debited:  ${totals.discount}`,
          party._id,
          false,
          totals.discount,
          0,
          totals.discount,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Inventory - DEBIT (company gold debited)
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "004",
          "GOLD",
          `Purchase Fix - Gold inventory debited: ${totals.pureWeight}g`,
          null,
          true,
          totals.pureWeight,
          0,
          totals.pureWeight,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Stock - DEBIT (company stock debited)
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          "005",
          "GOLD_STOCK",
          `Purchase Fix - Gold stock debited: ${totals.grossWeight}g`,
          null,
          true,
          totals.grossWeight,
          0,
          totals.grossWeight,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    return entries;
  }

  // SALE UNFIX - Registry entries (FIXED)
  static buildSaleUnfixEntries(
    totals,
    metalTransactionId,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    const entries = [];
    const partyName = party.customerName || party.accountCode;

    // Party Gold Balance - DEBIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "001",
          "PARTY_GOLD_BALANCE",
          `Sale Unfix - Gold balance debited for ${partyName}: ${totals.pureWeight}g`,
          party._id,
          false,
          totals.pureWeight,
          0,
          totals.pureWeight,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Making Charges - DEBIT
    if (totals.makingCharges > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "003",
          "MAKING_CHARGES",
          `Sale Unfix - Making charges debited:  ${totals.makingCharges}`,
          party._id,
          false,
          totals.makingCharges,
          0,
          totals.makingCharges,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Premium - DEBIT (if positive)
    if (totals.premium > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "004",
          "PREMIUM",
          `Sale Unfix - Premium debited:  ${totals.premium}`,
          party._id,
          false,
          totals.premium,
          0,
          totals.premium,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Discount - CREDIT (if exists)
    if (totals.discount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "007",
          "DISCOUNT",
          `Sale Unfix - Discount credited:  ${totals.discount}`,
          party._id,
          false,
          totals.discount,
          totals.discount,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Inventory - CREDIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "005",
          "GOLD",
          `Sale Unfix - Gold inventory credited: ${totals.pureWeight}g`,
          null,
          true,
          totals.pureWeight,
          totals.pureWeight,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Stock - CREDIT
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "006",
          "GOLD_STOCK",
          `Sale Unfix - Gold stock credited: ${totals.grossWeight}g`,
          null,
          true,
          totals.grossWeight,
          totals.grossWeight,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    return entries;
  }

  // SALE FIX - Registry entries (FIXED)
  static buildSaleFixEntries(
    totals,
    metalTransactionId,
    party,
    baseTransactionId,
    voucherDate,
    voucherNumber,
    adminId
  ) {
    const entries = [];
    const partyName = party.customerName || party.accountCode;

    // Party Cash Balance - DEBIT (total amount deducted)
    if (totals.totalAmount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "001",
          "PARTY_CASH_BALANCE",
          `Sale Fix - Cash balance debited for ${partyName}: AED ${totals.totalAmount}`,
          party._id,
          false,
          totals.totalAmount,
          0,
          totals.totalAmount,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Making Charges - DEBIT
    if (totals.makingCharges > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "002",
          "MAKING_CHARGES",
          `Sale Fix - Making charges debited:  ${totals.makingCharges}`,
          party._id,
          false,
          totals.makingCharges,
          0,
          totals.makingCharges,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Premium - DEBIT (if positive)
    if (totals.premium > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "003",
          "PREMIUM",
          `Sale Fix - Premium debited:  ${totals.premium}`,
          party._id,
          false,
          totals.premium,
          0,
          totals.premium,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Discount - CREDIT (if exists)
    if (totals.discount > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "007",
          "DISCOUNT",
          `Sale Fix - Discount credited:  ${totals.discount}`,
          party._id,
          false,
          totals.discount,
          totals.discount,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Inventory - CREDIT (company gold credited - reverse of purchase fix)
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "004",
          "GOLD",
          `Sale Fix - Gold inventory credited: ${totals.pureWeight}g`,
          null,
          true,
          totals.pureWeight,
          totals.pureWeight,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    // Gold Stock - CREDIT (company stock credited - reverse of purchase fix)
    if (totals.pureWeight > 0) {
      entries.push(
        this.createRegistryEntry(
          baseTransactionId,
          metalTransactionId,
          "005",
          "GOLD_STOCK",
          `Sale Fix - Gold stock credited: ${totals.grossWeight}g`,
          null,
          true,
          totals.grossWeight,
          totals.grossWeight,
          0,
          voucherDate,
          voucherNumber,
          adminId
        )
      );
    }

    return entries;
  }

  // Helper to create registry entry (optimized)
  static createRegistryEntry(
    baseId,
    metalTransactionId,
    suffix,
    type,
    description,
    partyId,
    isBullion,
    value,
    credit,
    debit,
    date,
    reference,
    adminId
  ) {
    if (value <= 0) return null;
    
    return {
      transactionId: `${baseId}-${suffix}`,
      metalTransactionId,
      type,
      description,
      party: partyId,
      isBullion,
      value: parseFloat(value.toFixed(2)),
      credit: parseFloat(credit.toFixed(2)),
      debit: parseFloat(debit.toFixed(2)),
      transactionDate: date,
      reference,
      createdBy: adminId,
      createdAt: new Date(),
    };
  }

  // Account balance updates (FIXED - Premium/Discount handling)
  static async updateAccountBalances(party, metalTransaction, session) {
    const { transactionType, fixed, unfix, stockItems, totalAmountSession } =
      metalTransaction;
    const totals = this.calculateTotals(stockItems, totalAmountSession);
    const mode = this.getTransactionMode(fixed, unfix);
    const balanceChanges = this.calculateBalanceChanges(
      transactionType,
      mode,
      totals
    );

    // Build update operations with proper debit/credit logic
    const updateOps = this.buildUpdateOperations(balanceChanges);

    if (Object.keys(updateOps).length > 0) {
      console.log("=== ACCOUNT BALANCE UPDATE ===", {
        partyId: party._id,
        partyName: party.customerName,
        balanceChanges,
        updateOps
      });

      await Account.findByIdAndUpdate(party._id, updateOps, {
        session,
        new: true,
      });
    }
  }

  // Build update operations for account balance (FIXED - Added premium/discount)
  static buildUpdateOperations(balanceChanges) {
    const incObj = {};
    const setObj = {};

    // Handle Gold Balance Updates (Allow negative balances)
    if (balanceChanges.goldBalance !== 0) {
      // Gold balance can go negative (debited more than available)
      incObj["balances.goldBalance.totalGrams"] = balanceChanges.goldBalance;
      incObj["balances.goldBalance.totalValue"] = balanceChanges.goldValue;
      setObj["balances.goldBalance.lastUpdated"] = new Date();
    }

    // Handle Cash Balance Updates (Allow negative balances)
    // Calculate net cash change: base + premium - discount
    const netCashChange = balanceChanges.cashBalance +
      balanceChanges.premiumBalance +
      balanceChanges.discountBalance;

    if (netCashChange !== 0) {
      // Cash balance can go negative (debited more than available)
      incObj["balances.cashBalance.amount"] = parseFloat(netCashChange.toFixed(2));
      setObj["balances.cashBalance.lastUpdated"] = new Date();
    }

    // Always update the last balance update timestamp
    setObj["balances.lastBalanceUpdate"] = new Date();

    const updateOps = {};
    if (Object.keys(incObj).length > 0) updateOps.$inc = incObj;
    if (Object.keys(setObj).length > 0) updateOps.$set = setObj;

    return updateOps;
  }

  // Calculate balance changes (UPDATED - Premium/Discount handling in cash balance)
  static calculateBalanceChanges(transactionType, mode, totals) {
    const balanceMatrix = {
      purchase: {
        unfix: {
          // PURCHASE UNFIX: Party receives gold, company pays cash components
          goldBalance: totals.pureWeight,        // CREDIT: Add gold to party
          goldValue: totals.goldValue,           // CREDIT: Add gold value
          cashBalance: totals.makingCharges,     // CREDIT: Add making charges
          premiumBalance: totals.premium,        // CREDIT: Add premium
          discountBalance: -totals.discount,     // DEBIT: Subtract discount
        },
        fix: {
          // PURCHASE FIX: Party receives total cash amount
          goldBalance: 0,                        // No gold movement
          goldValue: 0,                          // No gold value change
          cashBalance: totals.totalAmount,       // CREDIT: Add total amount
          premiumBalance: 0,                     // Already included in totalAmount
          discountBalance: 0,                    // Already included in totalAmount
        },
      },
      sale: {
        unfix: {
          // SALE UNFIX: Party gives gold, company receives cash components
          goldBalance: -totals.pureWeight,       // DEBIT: Remove gold from party
          goldValue: -totals.goldValue,          // DEBIT: Remove gold value
          cashBalance: -totals.makingCharges,    // DEBIT: Remove making charges
          premiumBalance: -totals.premium,       // DEBIT: Remove premium
          discountBalance: totals.discount,      // CREDIT: Add discount (party gets discount)
        },
        fix: {
          // SALE FIX: Party pays total cash amount
          goldBalance: 0,                        // No gold movement
          goldValue: 0,                          // No gold value change
          cashBalance: -totals.totalAmount,      // DEBIT: Remove total amount
          premiumBalance: 0,                     // Already included in totalAmount
          discountBalance: 0,                    // Already included in totalAmount
        },
      },
    };

    const changes = balanceMatrix[transactionType]?.[mode] || {
      goldBalance: 0,
      goldValue: 0,
      cashBalance: 0,
      premiumBalance: 0,
      discountBalance: 0,
    };

    // Calculate net cash change for logging
    const netCashChange = changes.cashBalance +
      changes.premiumBalance +
      changes.discountBalance;

    console.log("=== BALANCE CHANGES CALCULATION ===", {
      transactionType: transactionType.toUpperCase(),
      mode: mode.toUpperCase(),
      totals: {
        pureWeight: totals.pureWeight,
        goldValue: totals.goldValue,
        makingCharges: totals.makingCharges,
        premium: totals.premium,
        discount: totals.discount,
        totalAmount: totals.totalAmount
      },
      changes: {
        goldBalance: changes.goldBalance,
        goldValue: changes.goldValue,
        cashBalance: changes.cashBalance,
        premiumBalance: changes.premiumBalance,
        discountBalance: changes.discountBalance,
        netCashChange: netCashChange
      }
    });

    return changes;
  }

  // Generate unique transaction ID (optimized)
  static generateTransactionId() {
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `TXN-${year}-${randomNum}-${timestamp}`;
  }

  // Get transaction by ID with populated data (optimized)
  static async getMetalTransactionById(transactionId) {
    return await MetalTransaction.findById(transactionId)
      .populate("partyCode", "accountCode customerName")
      .populate("stockItems.stockCode", "stockName stockCode")
      .populate("createdBy", "username")
      .lean()
      .exec();
  }

  // Centralized error handling (enhanced)
  static handleError(error) {
    console.error("Metal Transaction Service Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });

    // Handle specific error types
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      throw createAppError(
        `Validation failed: ${errors.join(", ")}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw createAppError(
        `Duplicate ${field} detected`,
        409,
        "DUPLICATE_TRANSACTION"
      );
    }

    if (error.name === "CastError") {
      throw createAppError(
        "Invalid data format provided",
        400,
        "INVALID_DATA_FORMAT"
      );
    }

    if (error.name === "MongoNetworkError") {
      throw createAppError(
        "Database connection error",
        503,
        "DATABASE_CONNECTION_ERROR"
      );
    }

    // Re-throw custom app errors
    if (error.statusCode) {
      throw error;
    }

    // Generic server error
    throw createAppError(
      "Internal server error occurred",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }

  // Utility method to validate transaction data
  static validateTransactionData(transactionData) {
    const required = [
      "partyCode",
      "transactionType",
      "stockItems",
      "voucherDate",
      "voucherNumber",
    ];
    const missing = required.filter((field) => !transactionData[field]);

    if (missing.length > 0) {
      throw createAppError(
        `Missing required fields: ${missing.join(", ")}`,
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }

    if (!["purchase", "sale"].includes(transactionData.transactionType)) {
      throw createAppError(
        "Transaction type must be 'purchase' or 'sale'",
        400,
        "INVALID_TRANSACTION_TYPE"
      );
    }

    if (
      !Array.isArray(transactionData.stockItems) ||
      transactionData.stockItems.length === 0
    ) {
      throw createAppError(
        "Stock items must be a non-empty array",
        400,
        "INVALID_STOCK_ITEMS"
      );
    }

    return true;
  }

  // Bulk transaction processing (for future use)
  static async createBulkMetalTransactions(transactionsData, adminId) {
    const results = [];
    const errors = [];

    for (let i = 0; i < transactionsData.length; i++) {
      try {
        const result = await this.createMetalTransaction(
          transactionsData[i],
          adminId
        );
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        errors.push({ index: i, success: false, error: error.message });
      }
    }

    return { results, errors, totalProcessed: transactionsData.length };
  }

  // Additional helper method to get premium/discount breakdown
  static getPremiumDiscountBreakdown(stockItems) {
    return stockItems.reduce(
      (acc, item) => {
        const premiumDiscountAmount =
          item.itemTotal?.premiumTotal || item.premium?.amount || 0;

        if (premiumDiscountAmount > 0) {
          acc.totalPremium += premiumDiscountAmount;
          acc.premiumItems.push({
            stockCode: item.stockCode,
            amount: premiumDiscountAmount,
            type: "premium",
          });
        } else if (premiumDiscountAmount < 0) {
          const discountAmount = Math.abs(premiumDiscountAmount);
          acc.totalDiscount += discountAmount;
          acc.discountItems.push({
            stockCode: item.stockCode,
            amount: discountAmount,
            type: "discount",
          });
        }

        return acc;
      },
      {
        totalPremium: 0,
        totalDiscount: 0,
        premiumItems: [],
        discountItems: [],
      }
    );
  }

  // Method to validate premium/discount values
  static validatePremiumDiscount(stockItems) {
    const invalidItems = [];

    stockItems.forEach((item, index) => {
      const premiumDiscountAmount =
        item.itemTotal?.premiumTotal || item.premium?.amount;

      if (premiumDiscountAmount !== undefined && isNaN(premiumDiscountAmount)) {
        invalidItems.push({
          index,
          stockCode: item.stockCode,
          error: "Premium/Discount must be a valid number",
        });
      }
    });

    if (invalidItems.length > 0) {
      throw createAppError(
        `Invalid premium/discount values found: ${invalidItems
          .map(
            (item) =>
              `Item ${item.index + 1} (${item.stockCode}): ${item.error}`
          )
          .join(", ")}`,
        400,
        "INVALID_PREMIUM_DISCOUNT"
      );
    }

    return true;
  }


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Get all metal transactions with pagination and filters
  static async getAllMetalTransactions(page = 1, limit = 50, filters = {}) {
    const skip = (page - 1) * limit;
    const query = { isActive: true };

    if (filters.transactionType)
      query.transactionType = filters.transactionType;
    if (filters.partyCode) query.partyCode = filters.partyCode;
    if (filters.status) query.status = filters.status;
    if (filters.stockCode) query["stockItems.stockCode"] = filters.stockCode;
    if (filters.startDate && filters.endDate) {
      query.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const transactions = await MetalTransaction.find(query)
      .populate("partyCode", "accountCode customerName ")
      .populate("partyCurrency", "code symbol")
      .populate("itemCurrency", "code symbol")
      .populate("baseCurrency", "code symbol")
      .populate("stockItems.stockCode", "code description specifications")
      .populate("stockItems.metalRate", "metalType rate effectiveDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MetalTransaction.countDocuments(query);

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get metal transaction by ID
  static async getMetalTransactionById(transactionId) {
    const transaction = await MetalTransaction.findById(transactionId)
      .populate("partyCode", "accountCode customerName addresses")
      .populate("partyCurrency", "code symbol")
      .populate("itemCurrency", "code symbol")
      .populate("baseCurrency", "code symbol")
      .populate("stockItems.stockCode", "code description specifications")
      .populate("stockItems.metalRate", "metalType rate effectiveDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!transaction || !transaction.isActive) {
      throw createAppError(
        "Metal transaction not found",
        404,
        "TRANSACTION_NOT_FOUND"
      );
    }

    return transaction;
  }

  // Get transactions by party
  static async getTransactionsByParty(
    partyId,
    limit = 50,
    transactionType = null
  ) {
    const query = { partyCode: partyId, isActive: true };
    if (transactionType) query.transactionType = transactionType;

    return MetalTransaction.find(query)
      .populate("partyCode", "name code")
      .populate("partyCurrency", "code symbol")
      .populate("itemCurrency", "code symbol")
      .populate("stockItems.stockCode", "code description")
      .populate("stockItems.metalRate", "metalType rate")
      .populate("createdBy", "name email")
      .sort({ voucherDate: -1, createdAt: -1 })
      .limit(limit);
  }
  static async getUnfixedTransactions(page = 1, limit = 50, filters = {}) {
    const skip = (page - 1) * limit;
    const query = {
      isActive: true,
      unfix: true, // Show only transactions where unfix is true
    };

    // Apply filters
    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }
    if (filters.partyCode) {
      query.partyCode = filters.partyCode;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.startDate && filters.endDate) {
      query.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    // Find transactions but only populate specific party fields
    const transactions = await MetalTransaction.find(query)
      .populate({
        path: "partyCode",
        select:
          "accountCode customerName addresses balances.goldBalance.totalGrams balances.cashBalance.amount limitsMargins.shortMargin",
      })
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MetalTransaction.countDocuments(query);

    // Extract unique party data with only required fields
    const partyDataMap = new Map();
    transactions.forEach((transaction) => {
      if (transaction.partyCode && transaction.partyCode._id) {
        const partyId = transaction.partyCode._id.toString();
        if (!partyDataMap.has(partyId)) {
          const party = transaction.partyCode;

          // Find primary address or fallback to first address
          const primaryAddress =
            party.addresses?.find((addr) => addr.isPrimary === true) ||
            party.addresses?.[0];

          // Transform party data to include only required fields
          const transformedParty = {
            _id: party._id,
            accountCode: party.accountCode,
            customerName: party.customerName,
            email: primaryAddress?.email || null,
            phone: primaryAddress?.phoneNumber1 || null,
            goldBalance: {
              totalGrams: party.balances?.goldBalance?.totalGrams || 0,
            },
            cashBalance: party.balances?.cashBalance?.amount || 0,
            shortMargin: party.limitsMargins?.[0]?.shortMargin || 0,
          };

          partyDataMap.set(partyId, transformedParty);
        }
      }
    });

    const uniquePartyData = Array.from(partyDataMap.values());

    return {
      parties: uniquePartyData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      summary: {
        totalUnfixedTransactions: total,
        totalPurchases: transactions.filter(
          (t) => t.transactionType === "purchase"
        ).length,
        totalSales: transactions.filter((t) => t.transactionType === "sale")
          .length,
        totalParties: uniquePartyData.length,
      },
    };
  }

  // Get unfixed transactions with detailed account information
  static async getUnfixedTransactionsWithAccounts(
    page = 1,
    limit = 50,
    filters = {}
  ) {
    const skip = (page - 1) * limit;
    const matchStage = {
      isActive: true,
      isFixed: false, // Assuming you have an isFixed field
    };

    // Apply filters to match stage
    if (filters.transactionType) {
      matchStage.transactionType = filters.transactionType;
    }
    if (filters.partyCode) {
      matchStage.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
    }
    if (filters.status) {
      matchStage.status = filters.status;
    }
    if (filters.startDate && filters.endDate) {
      matchStage.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "accounts", // Your account collection name
          localField: "partyCode",
          foreignField: "_id",
          as: "accountDetails",
        },
      },
      {
        $unwind: "$accountDetails",
      },
      {
        $lookup: {
          from: "currencymasters",
          localField: "partyCurrency",
          foreignField: "_id",
          as: "partyCurrencyDetails",
        },
      },
      {
        $lookup: {
          from: "currencymasters",
          localField: "itemCurrency",
          foreignField: "_id",
          as: "itemCurrencyDetails",
        },
      },
      {
        $lookup: {
          from: "currencymasters",
          localField: "baseCurrency",
          foreignField: "_id",
          as: "baseCurrencyDetails",
        },
      },
      {
        $lookup: {
          from: "currencymasters",
          localField: "accountDetails.balances.goldBalance.currency",
          foreignField: "_id",
          as: "goldCurrencyDetails",
        },
      },
      {
        $lookup: {
          from: "currencymasters",
          localField: "accountDetails.balances.cashBalance.currency",
          foreignField: "_id",
          as: "cashCurrencyDetails",
        },
      },
      {
        $project: {
          // Transaction fields
          _id: 1,
          transactionType: 1,
          voucherDate: 1,
          voucherNumber: 1,
          status: 1,
          isFixed: 1,
          stockItems: 1,
          totalAmountSession: 1,
          createdAt: 1,
          updatedAt: 1,

          // Account information
          accountInfo: {
            id: "$accountDetails._id",
            accountCode: "$accountDetails.accountCode",
            customerName: "$accountDetails.customerName",
            email: "$accountDetails.email",
            phone: "$accountDetails.phone",
            isActive: "$accountDetails.isActive",
          },

          // Gold Balance
          goldBalance: {
            totalGrams: "$accountDetails.balances.goldBalance.totalGrams",
            totalValue: "$accountDetails.balances.goldBalance.totalValue",
            currency: {
              $arrayElemAt: [
                {
                  $map: {
                    input: "$goldCurrencyDetails",
                    as: "curr",
                    in: {
                      code: "$$curr.code",
                      symbol: "$$curr.symbol",
                    },
                  },
                },
                0,
              ],
            },
            lastUpdated: "$accountDetails.balances.goldBalance.lastUpdated",
          },

          // Cash Balance (array)
          cashBalance: {
            $map: {
              input: "$accountDetails.balances.cashBalance",
              as: "cash",
              in: {
                amount: "$$cash.amount",
                currency: {
                  $let: {
                    vars: {
                      currencyMatch: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$cashCurrencyDetails",
                              cond: { $eq: ["$$this._id", "$$cash.currency"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      code: "$$currencyMatch.code",
                      symbol: "$$currencyMatch.symbol",
                    },
                  },
                },
                lastUpdated: "$$cash.lastUpdated",
              },
            },
          },

          // Limits and Margins
          limitsMargins: {
            $map: {
              input: "$accountDetails.limitsMargins",
              as: "limit",
              in: {
                creditDaysAmt: "$$limit.creditDaysAmt",
                creditDaysMtl: "$$limit.creditDaysMtl",
                shortMargin: "$$limit.shortMargin",
                longMargin: "$$limit.longMargin",
              },
            },
          },

          // Currency details
          currencies: {
            party: { $arrayElemAt: ["$partyCurrencyDetails", 0] },
            item: { $arrayElemAt: ["$itemCurrencyDetails", 0] },
            base: { $arrayElemAt: ["$baseCurrencyDetails", 0] },
          },
        },
      },
      {
        $sort: { voucherDate: -1, createdAt: -1 },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await MetalTransaction.aggregate(pipeline);
    const transactions = result[0].data || [];
    const totalCount = result[0].totalCount[0]?.count || 0;

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Update metal transaction
  static async updateMetalTransaction(transactionId, updateData, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      const oldStockItems = [...transaction.stockItems];
      const oldSessionTotals = { ...transaction.totalAmountSession };

      // Update transaction
      Object.assign(transaction, { ...updateData, updatedBy: adminId });

      // Recalculate session totals if stock items changed
      if (updateData.stockItems) {
        transaction.calculateSessionTotals();
      }

      await transaction.save({ session });

      // Update registry and balances if stock items or totals changed
      if (updateData.stockItems || updateData.totalAmountSession) {
        const party = await Account.findById(transaction.partyCode).session(
          session
        );
        await this.createReversalRegistryEntries(
          {
            ...transaction.toObject(),
            stockItems: oldStockItems,
            totalAmountSession: oldSessionTotals,
          },
          party,
          adminId,
          session
        );
        await this.createCompleteRegistryEntries(
          transaction,
          party,
          adminId,
          session
        );
        await this.updateTradeDebtorsBalances(
          party._id,
          transaction,
          session,
          true
        );
      }

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Delete metal transaction (soft delete)
  static async deleteMetalTransaction(transactionId, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      transaction.isActive = false;
      transaction.status = "cancelled";
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await Account.findById(transaction.partyCode).session(
        session
      );
      await this.createReversalRegistryEntries(
        transaction,
        party,
        adminId,
        session
      );
      await this.updateTradeDebtorsBalances(
        party._id,
        transaction,
        session,
        false,
        true
      );

      await session.commitTransaction();
      return { message: "Metal transaction deleted successfully" };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Add stock item
  static async addStockItem(transactionId, stockItemData, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      transaction.addStockItem(stockItemData);
      transaction.calculateSessionTotals();
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await Account.findById(transaction.partyCode).session(
        session
      );
      const tempTransaction = {
        ...transaction.toObject(),
        stockItems: [stockItemData],
      };
      await this.createCompleteRegistryEntries(
        tempTransaction,
        party,
        adminId,
        session
      );
      await this.updateTradeDebtorsBalances(
        party._id,
        tempTransaction,
        session
      );

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Update stock item
  static async updateStockItem(
    transactionId,
    stockItemId,
    updateData,
    adminId
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      const stockItem = transaction.getStockItem(stockItemId);
      if (!stockItem) {
        throw createAppError(
          "Stock item not found",
          404,
          "STOCK_ITEM_NOT_FOUND"
        );
      }

      Object.assign(stockItem, updateData);
      transaction.calculateSessionTotals();
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await Account.findById(transaction.partyCode).session(
        session
      );
      await this.createCompleteRegistryEntries(
        transaction,
        party,
        adminId,
        session
      );

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Remove stock item
  static async removeStockItem(transactionId, stockItemId, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      transaction.removeStockItem(stockItemId);
      if (transaction.stockItems.length === 0) {
        throw createAppError(
          "Transaction must have at least one stock item",
          400,
          "MINIMUM_STOCK_ITEMS_REQUIRED"
        );
      }

      transaction.calculateSessionTotals();
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Update session totals
  static async updateSessionTotals(
    transactionId,
    totalAmountSession,
    vatPercentage = 0,
    adminId
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      if (totalAmountSession) {
        transaction.totalAmountSession = {
          ...transaction.totalAmountSession,
          ...totalAmountSession,
        };
      }

      if (vatPercentage > 0) {
        const netAmount = transaction.totalAmountSession.netAmountAED || 0;
        const vatAmount = (netAmount * vatPercentage) / 100;
        transaction.totalAmountSession.vatAmount = vatAmount;
        transaction.totalAmountSession.vatPercentage = vatPercentage;
        transaction.totalAmountSession.totalAmountAED = netAmount + vatAmount;
      }

      transaction.updatedBy = adminId;
      await transaction.save({ session });

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Calculate and update session totals
  static async calculateAndUpdateSessionTotals(
    transactionId,
    vatPercentage = 0,
    adminId
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(
        transactionId
      ).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError(
          "Metal transaction not found",
          404,
          "TRANSACTION_NOT_FOUND"
        );
      }

      transaction.calculateSessionTotals();
      if (vatPercentage > 0) {
        const netAmount = transaction.totalAmountSession.netAmountAED || 0;
        const vatAmount = (netAmount * vatPercentage) / 100;
        transaction.totalAmountSession.vatAmount = vatAmount;
        transaction.totalAmountSession.vatPercentage = vatPercentage;
        transaction.totalAmountSession.totalAmountAED = netAmount + vatAmount;
      }

      transaction.updatedBy = adminId;
      await transaction.save({ session });

      await session.commitTransaction();
      return await this.getMetalTransactionById(transactionId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get transaction statistics
  static async getTransactionStatistics(filters = {}) {
    const matchStage = { isActive: true };
    if (filters.transactionType)
      matchStage.transactionType = filters.transactionType;
    if (filters.partyCode)
      matchStage.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
    if (filters.startDate && filters.endDate) {
      matchStage.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const stats = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
          totalNetAmount: { $sum: "$totalAmountSession.netAmountAED" },
          totalVatAmount: { $sum: "$totalAmountSession.vatAmount" },
          averageTransactionAmount: {
            $avg: "$totalAmountSession.totalAmountAED",
          },
          purchaseCount: {
            $sum: { $cond: [{ $eq: ["$transactionType", "purchase"] }, 1, 0] },
          },
          saleCount: {
            $sum: { $cond: [{ $eq: ["$transactionType", "sale"] }, 1, 0] },
          },
          purchaseAmount: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "purchase"] },
                "$totalAmountSession.totalAmountAED",
                0,
              ],
            },
          },
          saleAmount: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "sale"] },
                "$totalAmountSession.totalAmountAED",
                0,
              ],
            },
          },
        },
      },
    ]);

    const statusBreakdown = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
        },
      },
    ]);

    return {
      overview: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalNetAmount: 0,
        totalVatAmount: 0,
        averageTransactionAmount: 0,
        purchaseCount: 0,
        saleCount: 0,
        purchaseAmount: 0,
        saleAmount: 0,
      },
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
        return acc;
      }, {}),
    };
  }

  // Get profit/loss analysis
  static async getProfitLossAnalysis(filters = {}) {
    const matchStage = { isActive: true };
    if (filters.partyCode)
      matchStage.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
    if (filters.stockCode)
      matchStage["stockItems.stockCode"] = new mongoose.Types.ObjectId(
        filters.stockCode
      );
    if (filters.startDate && filters.endDate) {
      matchStage.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const analysis = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
          totalNetAmount: { $sum: "$totalAmountSession.netAmountAED" },
          transactionCount: { $sum: 1 },
          totalWeight: { $sum: { $sum: "$stockItems.weightInOz" } },
          averageRate: {
            $avg: { $avg: "$stockItems.metalRateRequirements.rate" },
          },
        },
      },
    ]);

    const purchases = analysis.find((item) => item._id === "purchase") || {
      totalAmount: 0,
      totalNetAmount: 0,
      transactionCount: 0,
      totalWeight: 0,
      averageRate: 0,
    };

    const sales = analysis.find((item) => item._id === "sale") || {
      totalAmount: 0,
      totalNetAmount: 0,
      transactionCount: 0,
      totalWeight: 0,
      averageRate: 0,
    };

    const grossProfit = sales.totalNetAmount - purchases.totalNetAmount;
    const profitMargin =
      sales.totalNetAmount > 0 ? (grossProfit / sales.totalNetAmount) * 100 : 0;

    return {
      purchases: { ...purchases, _id: undefined },
      sales: { ...sales, _id: undefined },
      profitLoss: {
        grossProfit,
        profitMargin,
        totalRevenue: sales.totalAmount,
        totalCost: purchases.totalAmount,
        netProfit: sales.totalAmount - purchases.totalAmount,
      },
    };
  }

  // Updated Registry helper methods with enhanced logic
  static async createCompleteRegistryEntries(
    transaction,
    party,
    adminId,
    session
  ) {
    const registryEntries = [];
    const transactionId = `TXN-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`;

    // Calculate totals for charges
    let totalMakingCharges = 0;
    let totalPremiumAmount = 0;
    let totalPureWeight = 0;
    let totalStockValue = 0;

    // Process each stock item
    for (const stockItem of transaction.stockItems) {
      console.log("first");
      console.log(stockItem);
      const pureWeight = stockItem.pureWeight || 0;
      const itemValue = stockItem.itemTotal?.itemTotalAmount || 0;
      const makingCharges = stockItem.makingCharges || 0;
      const premiumAmount = stockItem.premiumAmount || 0;

      totalPureWeight += pureWeight;
      totalStockValue += itemValue;
      totalMakingCharges += makingCharges;
      totalPremiumAmount += premiumAmount;

      // 1. Gold Entry - Pure weight is credited (for purchases) or debited (for sales)
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "gold",
          description: `Gold ${transaction.transactionType} - ${stockItem.description || "Metal Item"
            }`,
          paryty: transaction.partyCode,
          value: pureWeight,
          debit: transaction.transactionType === "sale" ? pureWeight : 0,
          credit: transaction.transactionType === "purchase" ? pureWeight : 0,
          transactionDate: transaction.voucherDate,
          reference: `Stock-${stockItem._id}`,
          createdBy: adminId,
        })
      );

      // 2. Stock Balance Entry - Pure weight is credited (for purchases) or debited (for sales)
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "stock_balance",
          description: `Stock Balance ${transaction.transactionType} - ${stockItem.description || "Metal Item"
            }`,
          paryty: transaction.partyCode,
          value: pureWeight,
          debit: transaction.transactionType === "sale" ? pureWeight : 0,
          credit: transaction.transactionType === "purchase" ? pureWeight : 0,
          transactionDate: transaction.voucherDate,
          reference: `Stock-${stockItem._id}`,
          createdBy: adminId,
        })
      );
    }

    // 3. Making Charges Entry - If making charges exist, credit the amount
    if (totalMakingCharges > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "making_charges",
          description: `Making Charges - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalMakingCharges,
          debit: 0,
          credit: totalMakingCharges,
          transactionDate: transaction.voucherDate,
          reference: `MakingCharges-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // 4. Premium Entry - If premium amount exists, credit the amount
    if (totalPremiumAmount > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "premium",
          description: `Premium Amount - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalPremiumAmount,
          debit: 0,
          credit: totalPremiumAmount,
          transactionDate: transaction.voucherDate,
          reference: `Premium-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // 5. Party Gold Balance Entry - Pure weight is debited (opposite of gold entry)
    registryEntries.push(
      new Registry({
        transactionId: transactionId,
        type: "party_gold_balance",
        description: `Party Gold Balance - ${transaction.transactionType}`,
        paryty: transaction.partyCode,
        value: totalPureWeight,
        debit: transaction.transactionType === "purchase" ? totalPureWeight : 0,
        credit: transaction.transactionType === "sale" ? totalPureWeight : 0,
        transactionDate: transaction.voucherDate,
        reference: `PartyGold-${transaction._id}`,
        createdBy: adminId,
      })
    );

    // 6. Party Cash Balance Entry - Total amount is credited
    const totalAmountAED = transaction.totalAmountSession?.totalAmountAED || 0;
    if (totalAmountAED > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "party_cash_balance",
          description: `Party Cash Balance - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalAmountAED,
          debit: 0,
          credit: totalAmountAED,
          transactionDate: transaction.voucherDate,
          reference: `PartyCash-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // Insert all registry entries
    if (registryEntries.length > 0) {
      await Registry.insertMany(registryEntries, { session });
    }
  }

  static async createReversalRegistryEntries(
    transaction,
    party,
    adminId,
    session
  ) {
    const registryEntries = [];
    const transactionId = `TXN-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000
    )}`;

    // Calculate totals for reversal
    let totalMakingCharges = 0;
    let totalPremiumAmount = 0;
    let totalPureWeight = 0;

    // Process each stock item for reversal
    for (const stockItem of transaction.stockItems) {
      console.log(stockItem);
      console.log("first");
      const pureWeight = stockItem.pureWeight || 0;
      const makingCharges = stockItem.makingCharges || 0;
      const premiumAmount = stockItem.premiumAmount || 0;

      totalPureWeight += pureWeight;
      totalMakingCharges += makingCharges;
      totalPremiumAmount += premiumAmount;

      // Reverse Gold Entry
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "gold",
          description: `REVERSAL - Gold ${transaction.transactionType} - ${stockItem.description || "Metal Item"
            }`,
          paryty: transaction.partyCode,
          value: pureWeight,
          debit: transaction.transactionType === "purchase" ? pureWeight : 0,
          credit: transaction.transactionType === "sale" ? pureWeight : 0,
          transactionDate: new Date(),
          reference: `REV-Stock-${stockItem._id}`,
          createdBy: adminId,
        })
      );

      // Reverse Stock Balance Entry
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "stock_balance",
          description: `REVERSAL - Stock Balance ${transaction.transactionType
            } - ${stockItem.description || "Metal Item"}`,
          paryty: transaction.partyCode,
          value: pureWeight,
          debit: transaction.transactionType === "purchase" ? pureWeight : 0,
          credit: transaction.transactionType === "sale" ? pureWeight : 0,
          transactionDate: new Date(),
          reference: `REV-Stock-${stockItem._id}`,
          createdBy: adminId,
        })
      );
    }

    // Reverse Making Charges Entry
    if (totalMakingCharges > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "making_charges",
          description: `REVERSAL - Making Charges - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalMakingCharges,
          debit: totalMakingCharges,
          credit: 0,
          transactionDate: new Date(),
          reference: `REV-MakingCharges-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // Reverse Premium Entry
    if (totalPremiumAmount > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "premium",
          description: `REVERSAL - Premium Amount - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalPremiumAmount,
          debit: totalPremiumAmount,
          credit: 0,
          transactionDate: new Date(),
          reference: `REV-Premium-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // Reverse Party Gold Balance Entry
    registryEntries.push(
      new Registry({
        transactionId: transactionId,
        type: "party_gold_balance",
        description: `REVERSAL - Party Gold Balance - ${transaction.transactionType}`,
        paryty: transaction.partyCode,
        value: totalPureWeight,
        debit: transaction.transactionType === "sale" ? totalPureWeight : 0,
        credit:
          transaction.transactionType === "purchase" ? totalPureWeight : 0,
        transactionDate: new Date(),
        reference: `REV-PartyGold-${transaction._id}`,
        createdBy: adminId,
      })
    );

    // Reverse Party Cash Balance Entry
    const totalAmountAED = transaction.totalAmountSession?.totalAmountAED || 0;
    if (totalAmountAED > 0) {
      registryEntries.push(
        new Registry({
          transactionId: transactionId,
          type: "party_cash_balance",
          description: `REVERSAL - Party Cash Balance - ${transaction.transactionType}`,
          paryty: transaction.partyCode,
          value: totalAmountAED,
          debit: totalAmountAED,
          credit: 0,
          transactionDate: new Date(),
          reference: `REV-PartyCash-${transaction._id}`,
          createdBy: adminId,
        })
      );
    }

    // Insert all reversal registry entries
    if (registryEntries.length > 0) {
      await Registry.insertMany(registryEntries, { session });
    }
  }

  static async updateTradeDebtorsBalances(
    partyId,
    transaction,
    session,
    isUpdate = false,
    isReversal = false
  ) {
    const party = await Account.findById(partyId).session(session);
    if (!party) return;

    // Update Gold Balance
    let totalPureWeightInGrams = 0;
    let totalGoldValue = 0;

    transaction.stockItems.forEach((stockItem) => {
      const pureWeight = stockItem.pureWeight || 0;
      const itemValue = stockItem.itemTotal?.itemTotalAmount || 0;
      totalPureWeightInGrams += pureWeight;
      totalGoldValue += itemValue;
    });

    if (isReversal) {
      // Reverse the transaction
      if (transaction.transactionType === "purchase") {
        party.balances.goldBalance.totalGrams = Math.max(
          0,
          party.balances.goldBalance.totalGrams - totalPureWeightInGrams
        );
        party.balances.goldBalance.totalValue = Math.max(
          0,
          party.balances.goldBalance.totalValue - totalGoldValue
        );
      } else if (transaction.transactionType === "sale") {
        party.balances.goldBalance.totalGrams += totalPureWeightInGrams;
        party.balances.goldBalance.totalValue += totalGoldValue;
      }
    } else {
      // Normal transaction processing
      if (transaction.transactionType === "purchase") {
        party.balances.goldBalance.totalGrams += totalPureWeightInGrams;
        party.balances.goldBalance.totalValue += totalGoldValue;
      } else if (transaction.transactionType === "sale") {
        party.balances.goldBalance.totalGrams = Math.max(
          0,
          party.balances.goldBalance.totalGrams - totalPureWeightInGrams
        );
        party.balances.goldBalance.totalValue = Math.max(
          0,
          party.balances.goldBalance.totalValue - totalGoldValue
        );
      }
    }

    // Update Cash Balance
    const totalAmountAED = transaction.totalAmountSession?.totalAmountAED || 0;
    const totalAmountParty =
      transaction.totalAmountSession?.totalAmountParty || 0;

    if (isReversal) {
      // Reverse cash balance changes
      if (transaction.transactionType === "purchase") {
        // Reverse purchase: reduce cash balance (we had increased it)
        party.balances.cashBalance.totalAmountAED = Math.max(
          0,
          party.balances.cashBalance.totalAmountAED - totalAmountAED
        );
        party.balances.cashBalance.totalAmountParty = Math.max(
          0,
          party.balances.cashBalance.totalAmountParty - totalAmountParty
        );
      } else if (transaction.transactionType === "sale") {
        // Reverse sale: increase cash balance (we had decreased it)
        party.balances.cashBalance.totalAmountAED += totalAmountAED;
        party.balances.cashBalance.totalAmountParty += totalAmountParty;
      }
    } else {
      // Normal cash balance processing
      if (transaction.transactionType === "purchase") {
        // Purchase: increase cash balance (money owed to party)
        party.balances.cashBalance.totalAmountAED += totalAmountAED;
        party.balances.cashBalance.totalAmountParty += totalAmountParty;
      } else if (transaction.transactionType === "sale") {
        // Sale: decrease cash balance (money paid by party)
        party.balances.cashBalance.totalAmountAED = Math.max(
          0,
          party.balances.cashBalance.totalAmountAED - totalAmountAED
        );
        party.balances.cashBalance.totalAmountParty = Math.max(
          0,
          party.balances.cashBalance.totalAmountParty - totalAmountParty
        );
      }
    }

    // Update last transaction date
    party.balances.lastTransactionDate = new Date();

    // Update balance summary
    party.balances.summary = {
      totalOutstanding: party.balances.cashBalance.totalAmountAED,
      goldHoldings: party.balances.goldBalance.totalGrams,
      lastUpdated: new Date(),
    };

    await party.save({ session });
  }

  // Get party balance summary
  static async getPartyBalanceSummary(partyId) {
    const party = await Account.findById(partyId)
      .populate("balances.goldBalance.currency", "code symbol")
      .populate("balances.cashBalance.currency", "code symbol");

    if (!party || !party.isActive) {
      throw createAppError(
        "Party not found or inactive",
        404,
        "PARTY_NOT_FOUND"
      );
    }

    return {
      partyInfo: {
        id: party._id,
        name: party.name,
        code: party.code,
        email: party.email,
        phone: party.phone,
      },
      goldBalance: party.balances.goldBalance,
      cashBalance: party.balances.cashBalance,
      summary: party.balances.summary,
      lastTransactionDate: party.balances.lastTransactionDate,
    };
  }

  // Get transaction summary by date range
  static async getTransactionSummaryByDateRange(
    startDate,
    endDate,
    transactionType = null
  ) {
    const matchStage = {
      isActive: true,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (transactionType) {
      matchStage.transactionType = transactionType;
    }

    const summary = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$voucherDate" },
            },
            transactionType: "$transactionType",
          },
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
          totalNetAmount: { $sum: "$totalAmountSession.netAmountAED" },
          totalVatAmount: { $sum: "$totalAmountSession.vatAmount" },
          totalWeight: { $sum: { $sum: "$stockItems.weightInOz" } },
          totalPureWeight: { $sum: { $sum: "$stockItems.pureWeight" } },
        },
      },
      {
        $sort: { "_id.date": 1, "_id.transactionType": 1 },
      },
    ]);

    return summary;
  }

  // Get top parties by transaction volume
  static async getTopPartiesByVolume(
    limit = 10,
    transactionType = null,
    startDate = null,
    endDate = null
  ) {
    const matchStage = { isActive: true };

    if (transactionType) {
      matchStage.transactionType = transactionType;
    }

    if (startDate && endDate) {
      matchStage.voucherDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const topParties = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$partyCode",
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
          totalWeight: { $sum: { $sum: "$stockItems.weightInOz" } },
          totalPureWeight: { $sum: { $sum: "$stockItems.pureWeight" } },
          averageTransactionAmount: {
            $avg: "$totalAmountSession.totalAmountAED",
          },
          lastTransactionDate: { $max: "$voucherDate" },
        },
      },
      {
        $lookup: {
          from: "tradedebtors",
          localField: "_id",
          foreignField: "_id",
          as: "partyInfo",
        },
      },
      {
        $unwind: "$partyInfo",
      },
      {
        $project: {
          partyId: "$_id",
          partyName: "$partyInfo.name",
          partyCode: "$partyInfo.code",
          transactionCount: 1,
          totalAmount: 1,
          totalWeight: 1,
          totalPureWeight: 1,
          averageTransactionAmount: 1,
          lastTransactionDate: 1,
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return topParties;
  }

  // Validate transaction before processing
  static async validateTransaction(transactionData) {
    const errors = [];

    // Basic validations
    if (!transactionData.partyCode) {
      errors.push("Party code is required");
    }

    if (
      !transactionData.transactionType ||
      !["purchase", "sale"].includes(transactionData.transactionType)
    ) {
      errors.push("Valid transaction type (purchase/sale) is required");
    }

    if (!transactionData.voucherDate) {
      errors.push("Voucher date is required");
    }

    if (
      !transactionData.stockItems ||
      !Array.isArray(transactionData.stockItems) ||
      transactionData.stockItems.length === 0
    ) {
      errors.push("At least one stock item is required");
    }

    // Validate stock items
    if (transactionData.stockItems) {
      transactionData.stockItems.forEach((item, index) => {
        if (!item.stockCode) {
          errors.push(`Stock code is required for item ${index + 1}`);
        }
        if (!item.weightInOz || item.weightInOz <= 0) {
          errors.push(`Valid weight is required for item ${index + 1}`);
        }
        if (!item.purity || item.purity <= 0 || item.purity > 100) {
          errors.push(`Valid purity (0-100) is required for item ${index + 1}`);
        }
      });
    }

    // Check if party exists and is active
    if (transactionData.partyCode) {
      const party = await Account.findById(transactionData.partyCode);
      if (!party || !party.isActive) {
        errors.push("Party not found or inactive");
      }
    }

    if (errors.length > 0) {
      throw createAppError(
        `Validation failed: ${errors.join(", ")}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    return true;
  }

  // Bulk operations
  static async bulkCreateTransactions(transactionsData, adminId) {
    const results = [];
    const errors = [];

    for (let i = 0; i < transactionsData.length; i++) {
      try {
        await this.validateTransaction(transactionsData[i]);
        const transaction = await this.createMetalTransaction(
          transactionsData[i],
          adminId
        );
        results.push({ index: i, success: true, transaction });
      } catch (error) {
        errors.push({ index: i, success: false, error: error.message });
      }
    }

    return {
      successful: results,
      failed: errors,
      summary: {
        total: transactionsData.length,
        successful: results.length,
        failed: errors.length,
      },
    };
  }
}

export default MetalTransactionService;
