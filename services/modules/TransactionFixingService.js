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
      // Validate party ID
      if (!mongoose.Types.ObjectId.isValid(transactionData.partyId)) {
        throw createAppError("Invalid Party ID", 400, "INVALID_PARTY_ID");
      }

      // Validate date
      if (transactionData.transactionDate) {
        const transactionDate = new Date(transactionData.transactionDate);
        if (isNaN(transactionDate.getTime())) {
          throw createAppError("Invalid transaction date", 400, "INVALID_DATE");
        }
        transactionData.transactionDate = transactionDate;
      }

      // Validate transaction type
      if (!["purchase", "sell"].includes(transactionData.type.toLowerCase())) {
        throw createAppError(
          "Transaction type must be 'purchase' or 'sell'",
          400,
          "INVALID_TYPE"
        );
      }

      // Validate required fields for registry
      if (!transactionData.quantityGm || transactionData.quantityGm <= 0) {
        throw createAppError(
          "Quantity in grams is required and must be positive",
          400,
          "INVALID_QUANTITY"
        );
      }

      // Calculate total value
      const totalValue = transactionData.quantityGm;

      // Function to generate unique transaction ID
      const generateTransactionId = async function (type) {
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
      };

      // Generate the transaction ID
      const transactionId = await generateTransactionId(transactionData.type);

      // Get the account to update balances
      const account = await Account.findById(transactionData.partyId).session(
        session
      );
      if (!account) {
        throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
      }

      // Create the main transaction
      const transaction = new TransactionFixing({
        transactionId: transactionId, // Use the generated ID
        ...transactionData,
        createdBy: adminId,
      });

      await transaction.save({ session });

      // Generate transaction ID for registry entries
      const registryTransactionId = await Registry.generateTransactionId();

      // Create registry entries based on transaction type
      if (transactionData.type === "purchase") {
        // For PURCHASE:
        // 1. STOCK_BALANCE - Debit (increase stock)
        const stockBalanceEntry = new Registry({
          transactionId: `${registryTransactionId}-STOCK`,
          type: "STOCK_BALANCE",
          description: `Stock purchase from ${
            account.customerName || account.accountCode
          } - ${transactionData.metalType}`,
          party: transactionData.partyId,
          value: totalValue,
          debit: transactionData.quantityGm, // Quantity in grams as debit
          credit: 0,
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // 2. GOLD type - Debit (gold inventory increase)
        const goldEntry = new Registry({
          transactionId: `${registryTransactionId}-GOLD`,
          type: "GOLD",
          description: `Gold inventory increase - Purchase from ${
            account.customerName || account.accountCode
          }`,
          party: transactionData.partyId,
          value: totalValue,
          debit: transactionData.quantityGm,
          credit: 0,
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // 3. PARTY_GOLD_BALANCE - Credit (party owes us gold)
        const partyGoldBalanceEntry = new Registry({
          transactionId: `${registryTransactionId}-PARTY`,
          type: "PARTY_GOLD_BALANCE",
          description: `Party gold balance - Purchase from ${
            account.customerName || account.accountCode
          }`,
          party: transactionData.partyId,
          value: totalValue,
          debit: 0,
          credit: transactionData.quantityGm,
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // Save all registry entries
        await Promise.all([
          stockBalanceEntry.save({ session }),
          goldEntry.save({ session }),
          partyGoldBalanceEntry.save({ session }),
        ]);
        const currentGoldGrams = account.balances.goldBalance.totalGrams || 0;
        const currentGoldValue = account.balances.goldBalance.totalValue || 0;

        // Remove Math.max(0, ...) to allow negative values
        const newGoldGrams = currentGoldGrams - transactionData.quantityGm;
        const newGoldValue = currentGoldValue - totalValue;

        account.balances.goldBalance.totalGrams = newGoldGrams;
        account.balances.goldBalance.totalValue = newGoldValue;
        account.balances.goldBalance.lastUpdated = new Date();
        account.balances.lastBalanceUpdate = new Date();
      } else if (transactionData.type === "sell") {
        // For SELL (reverse logic):
        // 1. STOCK_BALANCE - Credit (decrease stock)
        const stockBalanceEntry = new Registry({
          transactionId: `${registryTransactionId}-STOCK`,
          type: "STOCK_BALANCE",
          description: `Stock sale to ${
            account.customerName || account.accountCode
          } - ${transactionData.metalType}`,
          party: transactionData.partyId,
          value: totalValue,
          debit: 0,
          credit: transactionData.quantityGm, // Quantity in grams as credit
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // 2. GOLD type - Credit (gold inventory decrease)
        const goldEntry = new Registry({
          transactionId: `${registryTransactionId}-GOLD`,
          type: "GOLD",
          description: `Gold inventory decrease - Sale to ${
            account.customerName || account.accountCode
          }`,
          party: transactionData.partyId,
          value: totalValue,
          debit: 0,
          credit: transactionData.quantityGm,
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // 3. PARTY_GOLD_BALANCE - Debit (party gives us gold)
        const partyGoldBalanceEntry = new Registry({
          transactionId: `${registryTransactionId}-PARTY`,
          type: "PARTY_GOLD_BALANCE",
          description: `Party gold balance - Sale to ${
            account.customerName || account.accountCode
          }`,
          party: transactionData.partyId,
          value: totalValue,
          debit: transactionData.quantityGm,
          credit: 0,
          transactionDate: transactionData.transactionDate || new Date(),
          reference: transaction._id.toString(),
          createdBy: adminId,
        });

        // Save all registry entries
        await Promise.all([
          stockBalanceEntry.save({ session }),
          goldEntry.save({ session }),
          partyGoldBalanceEntry.save({ session }),
        ]);
        // FIXED: Allow negative to positive transition for sell
        const currentGoldGrams = account.balances.goldBalance.totalGrams || 0;
        const currentGoldValue = account.balances.goldBalance.totalValue || 0;

        // Remove Math.max(0, ...) to allow full calculation
        const newGoldGrams = currentGoldGrams + transactionData.quantityGm;
        const newGoldValue = currentGoldValue + totalValue;

        account.balances.goldBalance.totalGrams = newGoldGrams;
        account.balances.goldBalance.totalValue = newGoldValue;
        account.balances.goldBalance.lastUpdated = new Date();
        account.balances.lastBalanceUpdate = new Date();
      }

      // Save the updated account
      await account.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Return the populated transaction
      return await TransactionFixing.findById(transaction._id)
        .populate("partyId", "name code customerName accountCode")
        .populate("createdBy", "name email");
    } catch (error) {
      // Rollback the transaction
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
