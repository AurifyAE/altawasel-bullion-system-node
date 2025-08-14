import TransactionFixing from "../../models/modules/TransactionFixing.js";
import Registry from "../../models/modules/Registry.js"; // Add this import
import Account from "../../models/modules/AccountType.js"; // Add this import
import { createAppError } from "../../utils/errorHandler.js";
import mongoose from "mongoose";

export const TransactionFixingService = {
  // Create Transaction with Registry Integration
  createTransaction: async (transactionData, adminId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ====== VALIDATE PARTY ======
      if (!mongoose.Types.ObjectId.isValid(transactionData.partyId)) {
        throw createAppError("Invalid Party ID", 400, "INVALID_PARTY_ID");
      }

      // ====== VALIDATE VOUCHER DATE ======
      if (transactionData.voucherDate) {
        const voucherDate = new Date(transactionData.voucherDate);
        if (isNaN(voucherDate.getTime())) {
          throw createAppError("Invalid voucher date", 400, "INVALID_DATE");
        }
        transactionData.voucherDate = voucherDate;
      }

      // ====== VALIDATE TRANSACTION TYPE ======
      if (!["PURCHASE", "SELL"].includes(transactionData.type.toUpperCase())) {
        throw createAppError("Type must be 'PURCHASE' or 'SELL'", 400, "INVALID_TYPE");
      }

      // ====== VALIDATE ORDERS ======
      if (!Array.isArray(transactionData.orders) || transactionData.orders.length === 0) {
        throw createAppError("At least one order is required", 400, "NO_ORDERS");
      }

      transactionData.orders.forEach((order, index) => {
        if (!order.quantityGm || order.quantityGm <= 0) {
          throw createAppError(`Order ${index + 1}: Quantity must be positive`, 400, "INVALID_QUANTITY");
        }
        if (!order.price || order.price <= 0) {
          throw createAppError(`Order ${index + 1}: Price must be positive`, 400, "INVALID_PRICE");
        }
        if (!mongoose.Types.ObjectId.isValid(order.metalType)) {
          throw createAppError(`Order ${index + 1}: Invalid metalType ID`, 400, "INVALID_METAL_TYPE");
        }
        if (!order.goldBidValue || order.goldBidValue <= 0) {
          throw createAppError(`Order ${index + 1}: Gold bid value must be positive`, 400, "INVALID_GOLD_BID");
        }
      });

      // Function to generate unique transaction ID
      const generateTransactionId = async function (type) {
        const prefix = type.toUpperCase() === "PURCHASE" ? "PUR" : "SELL";
        let isUnique = false;
        let transactionId;

        while (!isUnique) {
          const randomNum = Math.floor(Math.random() * 90000) + 10000;
          transactionId = `${prefix}${randomNum}`;
          const existingTransaction = await mongoose
            .model("TransactionFixing")
            .findOne({ transactionId });
          if (!existingTransaction) {
            isUnique = true;
          }
        }

        return transactionId;
      };

      // Generate the transaction ID
      const transactionId = await generateTransactionId(transactionData.type);

      // ====== VERIFY ACCOUNT EXISTS ======
      const account = await Account.findById(transactionData.partyId).session(session);
      if (!account) {
        throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
      }

      // ====== CREATE TRANSACTION DOCUMENT ======
      const transaction = new TransactionFixing({
        ...transactionData,
        transactionId,
        createdBy: adminId,
      });

      await transaction.save({ session });

      // Initialize account balance updates
      let totalGoldGramsChange = 0;
      let totalCashBalanceChange = 0;

      // Create registry entries for each order
      const registryEntries = [];

      for (const [index, order] of transactionData.orders.entries()) {
        const registryTransactionId = await Registry.generateTransactionId();
        const totalValue = order.price * order.quantityGm;

        if (transactionData.type.toUpperCase() === "PURCHASE") {
          // PARTY_GOLD_BALANCE - Debit (party gives gold to us)
          const partyGoldBalanceEntry = new Registry({
            transactionId: `${registryTransactionId}-PARTY-GOLD-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "PARTY_GOLD_BALANCE",
            description: `Party gold balance - Purchase order ${index + 1} from ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            isBullion: false,
            goldBidValue: order.goldBidValue,
            value: order.quantityGm,
            grossWeight: order.quantityGm,
            debit: order.quantityGm,
            goldCredit: order.quantityGm,
            cashDebit: order.price,
            credit: 0,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          // PURCHASE-FIXING
          const partyGoldBalanceEntryFIX = new Registry({
            transactionId: `${registryTransactionId}-PARTY-GOLD-FIX-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "purchase-fixing",
            description: `Party gold balance - Purchase order ${index + 1} from ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            isBullion: false,
            goldBidValue: order.goldBidValue,
            value: order.quantityGm,
            grossWeight: order.quantityGm,
            debit: 0,
            goldCredit: order.quantityGm,
            cashDebit: order.price,
            credit: order.quantityGm,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          // PARTY_CASH_BALANCE - Credit (we pay cash to party)
          const partyCashBalanceEntry = new Registry({
            transactionId: `${registryTransactionId}-PARTY-CASH-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "PARTY_CASH_BALANCE",
            description: `Party cash balance - Payment for gold purchase order ${index + 1} from ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            isBullion: false,
            goldBidValue: order.goldBidValue,
            value: totalValue,
            grossWeight: order.quantityGm,
            debit: 0,
            goldCredit: order.quantityGm,
            cashDebit: order.price,
            credit: totalValue,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          registryEntries.push(
            partyGoldBalanceEntry,
            partyGoldBalanceEntryFIX,
            partyCashBalanceEntry
          );

          // Update running totals for account balances
          totalGoldGramsChange -= order.quantityGm;
          totalCashBalanceChange += totalValue;

        } else if (transactionData.type.toUpperCase() === "SELL") {
          // PARTY_GOLD_BALANCE - Credit (party receives gold from us)
          const partyGoldBalanceEntry = new Registry({
            transactionId: `${registryTransactionId}-PARTY-GOLD-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "PARTY_GOLD_BALANCE",
            description: `Party gold balance - Sale order ${index + 1} to ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            isBullion: false,
            goldBidValue: order.goldBidValue,
            value: order.quantityGm,
            grossWeight: order.quantityGm,
            debit: 0,
            goldCredit: order.quantityGm,
            cashDebit: order.price,
            credit: order.quantityGm,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          // SALES-FIXING
          const partyGoldBalanceEntryFIX = new Registry({
            transactionId: `${registryTransactionId}-PARTY-GOLD-FIX-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "sales-fixing",
            description: `Party gold balance - Sale order ${index + 1} to ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            isBullion: false,
            value: 0,
            goldBidValue: order.goldBidValue,
            grossWeight: order.quantityGm,
            debit: order.quantityGm,
            goldDebit: order.quantityGm,
            cashCredit: order.price,
            credit: 0,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          // PARTY_CASH_BALANCE - Debit (party pays cash to us)
          const partyCashBalanceEntry = new Registry({
            transactionId: `${registryTransactionId}-PARTY-CASH-${index + 1}`,
            fixingTransactionId: transaction._id,
            type: "PARTY_CASH_BALANCE",
            description: `Party cash balance - Payment for gold sale order ${index + 1} to ${account.customerName || account.accountCode}`,
            party: transactionData.partyId,
            value: totalValue,
            goldBidValue: order.goldBidValue,
            grossWeight: order.quantityGm,
            debit: totalValue,
            credit: 0,
            goldDebit: order.quantityGm,
            cashCredit: order.price,
            transactionDate: transactionData.transactionDate || new Date(),
            reference: transaction.voucherNumber,
            createdBy: adminId,
          });

          registryEntries.push(
            partyGoldBalanceEntry,
            partyGoldBalanceEntryFIX,
            partyCashBalanceEntry
          );

          // Update running totals for account balances
          totalGoldGramsChange += order.quantityGm;
          totalCashBalanceChange -= totalValue;
        }
      }

      // Save all registry entries
      await Promise.all(registryEntries.map(entry => entry.save({ session })));

      // Update account balances
      const currentGoldGrams = account.balances.goldBalance.totalGrams || 0;
      const currentCashBalance = account.balances.cashBalance.amount || 0;

      // Update gold balance
      account.balances.goldBalance.totalGrams = currentGoldGrams + totalGoldGramsChange;
      account.balances.goldBalance.totalValue = 0;
      account.balances.goldBalance.lastUpdated = new Date();

      // Update cash balance
      account.balances.cashBalance.amount = currentCashBalance + totalCashBalanceChange;
      account.balances.cashBalance.lastUpdated = new Date();

      // Update overall balance tracking
      account.balances.lastBalanceUpdate = new Date();

      // Save the updated account
      await account.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Return the populated transaction
      return await TransactionFixing.findById(transaction._id)
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Get all Transactions with pagination and filtering
  getAllTransactions: async (
    page = 1,
    limit = 10,
    search = "",
    status = "",
    type = "",
    metalType = "",
    partyId = ""
  ) => {
    try {
      const skip = (page - 1) * limit;

      // Build filter query
      const filter = {};
      if (search) {
        filter.$or = [
          { transactionId: { $regex: search, $options: "i" } },
          { metalType: { $regex: search, $options: "i" } },
          { referenceNumber: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }
      if (status) {
        filter.status = status;
      }
      if (type) {
        filter.type = type;
      }
      if (metalType) {
        filter.metalType = metalType.toUpperCase();
      }
      if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
        filter.partyId = partyId;
      }

      const transactions = await TransactionFixing.find(filter)
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await TransactionFixing.countDocuments(filter);

      return {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      };
    } catch (error) {
      throw error;
    }
  },

  // Get Transaction by ID
  getTransactionById: async (id) => {
    try {
      const transaction = await TransactionFixing.findById(id)
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      return transaction;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Update Transaction
  updateTransaction: async (id, updateData, adminId) => {
    try {
      const transaction = await TransactionFixing.findById(id);
      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      // Validate party ID if being updated
      if (
        updateData.partyId &&
        !mongoose.Types.ObjectId.isValid(updateData.partyId)
      ) {
        throw createAppError("Invalid Party ID", 400, "INVALID_PARTY_ID");
      }

      // Validate date if being updated
      if (updateData.transactionDate) {
        const transactionDate = new Date(updateData.transactionDate);
        if (isNaN(transactionDate.getTime())) {
          throw createAppError("Invalid transaction date", 400, "INVALID_DATE");
        }
        updateData.transactionDate = transactionDate;
      }

      // Validate transaction type if being updated
      if (updateData.type && !["purchase", "sell"].includes(updateData.type)) {
        throw createAppError(
          "Transaction type must be 'purchase' or 'sell'",
          400,
          "INVALID_TYPE"
        );
      }

      const updatedTransaction = await TransactionFixing.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedBy: adminId,
        },
        { new: true, runValidators: true }
      )
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return updatedTransaction;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Delete Transaction (Soft Delete)
  deleteTransaction: async (id, adminId) => {
    try {
      const transaction = await TransactionFixing.findById(id);
      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      const deletedTransaction = await TransactionFixing.findByIdAndUpdate(
        id,
        {
          status: "inactive",
          isActive: false,
          updatedBy: adminId,
        },
        { new: true }
      )
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return deletedTransaction;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Cancel Transaction
  cancelTransaction: async (id, adminId) => {
    try {
      const transaction = await TransactionFixing.findById(id);
      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      const cancelledTransaction = await TransactionFixing.findByIdAndUpdate(
        id,
        {
          status: "cancelled",
          updatedBy: adminId,
        },
        { new: true }
      )
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return cancelledTransaction;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Permanently Delete Transaction
  permanentDeleteTransaction: async (id) => {
    try {
      const transaction = await TransactionFixing.findById(id);
      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      await TransactionFixing.findByIdAndDelete(id);
      return { message: "Transaction permanently deleted" };
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Restore Transaction
  restoreTransaction: async (id, adminId) => {
    try {
      const transaction = await TransactionFixing.findById(id);
      if (!transaction) {
        throw createAppError("Transaction not found", 404, "NOT_FOUND");
      }

      const restoredTransaction = await TransactionFixing.findByIdAndUpdate(
        id,
        {
          status: "active",
          isActive: true,
          updatedBy: adminId,
        },
        { new: true }
      )
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return restoredTransaction;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid Transaction ID", 400, "INVALID_ID");
      }
      throw error;
    }
  },

  // Get transactions by party
  getTransactionsByParty: async (partyId, startDate = null, endDate = null) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(partyId)) {
        throw createAppError("Invalid Party ID", 400, "INVALID_PARTY_ID");
      }

      return await TransactionFixing.getTransactionsByParty(
        partyId,
        startDate,
        endDate
      );
    } catch (error) {
      throw error;
    }
  },

  // Get transactions by metal type
  getTransactionsByMetal: async (
    metalType,
    startDate = null,
    endDate = null
  ) => {
    try {
      return await TransactionFixing.getTransactionsByMetal(
        metalType,
        startDate,
        endDate
      );
    } catch (error) {
      throw error;
    }
  },

  // Get party metal summary
  getPartyMetalSummary: async (partyId, metalType) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(partyId)) {
        throw createAppError("Invalid Party ID", 400, "INVALID_PARTY_ID");
      }

      return await TransactionFixing.getPartyMetalSummary(partyId, metalType);
    } catch (error) {
      throw error;
    }
  },
};
