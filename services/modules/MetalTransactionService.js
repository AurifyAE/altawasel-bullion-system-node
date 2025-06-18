import mongoose from "mongoose";
import MetalTransaction from "../../models/modules/MetalTransaction.js";
import Registry from "../../models/modules/Registry.js";
import TradeDebtors from "../../models/modules/TradeDebtors.js";
import { createAppError } from "../../utils/errorHandler.js";

class MetalTransactionService {
  // Create a new metal transaction
  static async createMetalTransaction(transactionData, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Validate party
      const party = await TradeDebtors.findById(transactionData.partyCode).session(session);
      if (!party || !party.isActive) {
        throw createAppError("Party not found or inactive", 400, "INVALID_PARTY");
      }

      // Create metal transaction
      const metalTransaction = new MetalTransaction({
        ...transactionData,
        createdBy: adminId,
      });

      // Calculate session totals if not provided
      if (!transactionData.totalAmountSession?.totalAmountAED) {
        metalTransaction.calculateSessionTotals();
      }

      await metalTransaction.save({ session });

      // Create registry entries for stock items and charges
      await this.createCompleteRegistryEntries(metalTransaction, party, adminId, session);

      // Update TradeDebtors balances
      await this.updateTradeDebtorsBalances(party._id, metalTransaction, session);

      await session.commitTransaction();
      return await this.getMetalTransactionById(metalTransaction._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get all metal transactions with pagination and filters
  static async getAllMetalTransactions(page = 1, limit = 50, filters = {}) {
    const skip = (page - 1) * limit;
    const query = { isActive: true };

    if (filters.transactionType) query.transactionType = filters.transactionType;
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
      .populate("partyCode", "name code email phone")
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
      .populate("partyCode", "name code email phone")
      .populate("partyCurrency", "code symbol")
      .populate("itemCurrency", "code symbol")
      .populate("baseCurrency", "code symbol")
      .populate("stockItems.stockCode", "code description specifications")
      .populate("stockItems.metalRate", "metalType rate effectiveDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!transaction || !transaction.isActive) {
      throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }

    return transaction;
  }

  // Get transactions by party
  static async getTransactionsByParty(partyId, limit = 50, transactionType = null) {
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

  // Update metal transaction
  static async updateMetalTransaction(transactionId, updateData, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
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
        const party = await TradeDebtors.findById(transaction.partyCode).session(session);
        await this.createReversalRegistryEntries(
          { ...transaction.toObject(), stockItems: oldStockItems, totalAmountSession: oldSessionTotals }, 
          party, 
          adminId, 
          session
        );
        await this.createCompleteRegistryEntries(transaction, party, adminId, session);
        await this.updateTradeDebtorsBalances(party._id, transaction, session, true);
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

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
      }

      transaction.isActive = false;
      transaction.status = "cancelled";
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await TradeDebtors.findById(transaction.partyCode).session(session);
      await this.createReversalRegistryEntries(transaction, party, adminId, session);
      await this.updateTradeDebtorsBalances(party._id, transaction, session, false, true);

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

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
      }

      transaction.addStockItem(stockItemData);
      transaction.calculateSessionTotals();
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await TradeDebtors.findById(transaction.partyCode).session(session);
      const tempTransaction = { ...transaction.toObject(), stockItems: [stockItemData] };
      await this.createCompleteRegistryEntries(tempTransaction, party, adminId, session);
      await this.updateTradeDebtorsBalances(party._id, tempTransaction, session);

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
  static async updateStockItem(transactionId, stockItemId, updateData, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
      }

      const stockItem = transaction.getStockItem(stockItemId);
      if (!stockItem) {
        throw createAppError("Stock item not found", 404, "STOCK_ITEM_NOT_FOUND");
      }

      Object.assign(stockItem, updateData);
      transaction.calculateSessionTotals();
      transaction.updatedBy = adminId;
      await transaction.save({ session });

      const party = await TradeDebtors.findById(transaction.partyCode).session(session);
      await this.createCompleteRegistryEntries(transaction, party, adminId, session);

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

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
      }

      transaction.removeStockItem(stockItemId);
      if (transaction.stockItems.length === 0) {
        throw createAppError("Transaction must have at least one stock item", 400, "MINIMUM_STOCK_ITEMS_REQUIRED");
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
  static async updateSessionTotals(transactionId, totalAmountSession, vatPercentage = 0, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
      }

      if (totalAmountSession) {
        transaction.totalAmountSession = { ...transaction.totalAmountSession, ...totalAmountSession };
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
  static async calculateAndUpdateSessionTotals(transactionId, vatPercentage = 0, adminId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const transaction = await MetalTransaction.findById(transactionId).session(session);
      if (!transaction || !transaction.isActive) {
        throw createAppError("Metal transaction not found", 404, "TRANSACTION_NOT_FOUND");
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
    if (filters.transactionType) matchStage.transactionType = filters.transactionType;
    if (filters.partyCode) matchStage.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
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
          averageTransactionAmount: { $avg: "$totalAmountSession.totalAmountAED" },
          purchaseCount: { $sum: { $cond: [{ $eq: ["$transactionType", "purchase"] }, 1, 0] } },
          saleCount: { $sum: { $cond: [{ $eq: ["$transactionType", "sale"] }, 1, 0] } },
          purchaseAmount: {
            $sum: { $cond: [{ $eq: ["$transactionType", "purchase"] }, "$totalAmountSession.totalAmountAED", 0] },
          },
          saleAmount: {
            $sum: { $cond: [{ $eq: ["$transactionType", "sale"] }, "$totalAmountSession.totalAmountAED", 0] },
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
    if (filters.partyCode) matchStage.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
    if (filters.stockCode) matchStage["stockItems.stockCode"] = new mongoose.Types.ObjectId(filters.stockCode);
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
          averageRate: { $avg: { $avg: "$stockItems.metalRateRequirements.rate" } },
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
    const profitMargin = sales.totalNetAmount > 0 ? (grossProfit / sales.totalNetAmount) * 100 : 0;

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
  static async createCompleteRegistryEntries(transaction, party, adminId, session) {
    const registryEntries = [];
    const transactionId = `TXN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // Calculate totals for charges
    let totalMakingCharges = 0;
    let totalPremiumAmount = 0;
    let totalPureWeight = 0;
    let totalStockValue = 0;

    // Process each stock item
    for (const stockItem of transaction.stockItems) {
      console.log("first")
      console.log(stockItem)
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
          description: `Gold ${transaction.transactionType} - ${stockItem.description || "Metal Item"}`,
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
          description: `Stock Balance ${transaction.transactionType} - ${stockItem.description || "Metal Item"}`,
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

  static async createReversalRegistryEntries(transaction, party, adminId, session) {
    const registryEntries = [];
    const transactionId = `TXN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // Calculate totals for reversal
    let totalMakingCharges = 0;
    let totalPremiumAmount = 0;
    let totalPureWeight = 0;

    // Process each stock item for reversal
    for (const stockItem of transaction.stockItems) {
      console.log(stockItem)
      console.log("first")
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
          description: `REVERSAL - Gold ${transaction.transactionType} - ${stockItem.description || "Metal Item"}`,
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
          description: `REVERSAL - Stock Balance ${transaction.transactionType} - ${stockItem.description || "Metal Item"}`,
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
        credit: transaction.transactionType === "purchase" ? totalPureWeight : 0,
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

  static async updateTradeDebtorsBalances(partyId, transaction, session, isUpdate = false, isReversal = false) {
    const party = await TradeDebtors.findById(partyId).session(session);
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
        party.balances.goldBalance.totalGrams = Math.max(0, party.balances.goldBalance.totalGrams - totalPureWeightInGrams);
        party.balances.goldBalance.totalValue = Math.max(0, party.balances.goldBalance.totalValue - totalGoldValue);
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
        party.balances.goldBalance.totalGrams = Math.max(0, party.balances.goldBalance.totalGrams - totalPureWeightInGrams);
        party.balances.goldBalance.totalValue = Math.max(0, party.balances.goldBalance.totalValue - totalGoldValue);
      }
    }

    // Update Cash Balance
    const totalAmountAED = transaction.totalAmountSession?.totalAmountAED || 0;
    const totalAmountParty = transaction.totalAmountSession?.totalAmountParty || 0;

    if (isReversal) {
      // Reverse cash balance changes
      if (transaction.transactionType === "purchase") {
        // Reverse purchase: reduce cash balance (we had increased it)
        party.balances.cashBalance.totalAmountAED = Math.max(0, party.balances.cashBalance.totalAmountAED - totalAmountAED);
        party.balances.cashBalance.totalAmountParty = Math.max(0, party.balances.cashBalance.totalAmountParty - totalAmountParty);
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
        party.balances.cashBalance.totalAmountAED = Math.max(0, party.balances.cashBalance.totalAmountAED - totalAmountAED);
        party.balances.cashBalance.totalAmountParty = Math.max(0, party.balances.cashBalance.totalAmountParty - totalAmountParty);
      }
    }

    // Update last transaction date
    party.balances.lastTransactionDate = new Date();
    
    // Update balance summary
    party.balances.summary = {
      totalOutstanding: party.balances.cashBalance.totalAmountAED,
      goldHoldings: party.balances.goldBalance.totalGrams,
      lastUpdated: new Date()
    };

    await party.save({ session });
  }

  // Get party balance summary
  static async getPartyBalanceSummary(partyId) {
    const party = await TradeDebtors.findById(partyId)
      .populate('balances.goldBalance.currency', 'code symbol')
      .populate('balances.cashBalance.currency', 'code symbol');

    if (!party || !party.isActive) {
      throw createAppError("Party not found or inactive", 404, "PARTY_NOT_FOUND");
    }

    return {
      partyInfo: {
        id: party._id,
        name: party.name,
        code: party.code,
        email: party.email,
        phone: party.phone
      },
      goldBalance: party.balances.goldBalance,
      cashBalance: party.balances.cashBalance,
      summary: party.balances.summary,
      lastTransactionDate: party.balances.lastTransactionDate
    };
  }

  // Get transaction summary by date range
  static async getTransactionSummaryByDateRange(startDate, endDate, transactionType = null) {
    const matchStage = {
      isActive: true,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (transactionType) {
      matchStage.transactionType = transactionType;
    }

    const summary = await MetalTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$voucherDate" } },
            transactionType: "$transactionType"
          },
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountSession.totalAmountAED" },
          totalNetAmount: { $sum: "$totalAmountSession.netAmountAED" },
          totalVatAmount: { $sum: "$totalAmountSession.vatAmount" },
          totalWeight: { $sum: { $sum: "$stockItems.weightInOz" } },
          totalPureWeight: { $sum: { $sum: "$stockItems.pureWeight" } }
        }
      },
      {
        $sort: { "_id.date": 1, "_id.transactionType": 1 }
      }
    ]);

    return summary;
  }

  // Get top parties by transaction volume
  static async getTopPartiesByVolume(limit = 10, transactionType = null, startDate = null, endDate = null) {
    const matchStage = { isActive: true };
    
    if (transactionType) {
      matchStage.transactionType = transactionType;
    }
    
    if (startDate && endDate) {
      matchStage.voucherDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
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
          averageTransactionAmount: { $avg: "$totalAmountSession.totalAmountAED" },
          lastTransactionDate: { $max: "$voucherDate" }
        }
      },
      {
        $lookup: {
          from: "tradedebtors",
          localField: "_id",
          foreignField: "_id",
          as: "partyInfo"
        }
      },
      {
        $unwind: "$partyInfo"
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
          lastTransactionDate: 1
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: limit
      }
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

    if (!transactionData.transactionType || !["purchase", "sale"].includes(transactionData.transactionType)) {
      errors.push("Valid transaction type (purchase/sale) is required");
    }

    if (!transactionData.voucherDate) {
      errors.push("Voucher date is required");
    }

    if (!transactionData.stockItems || !Array.isArray(transactionData.stockItems) || transactionData.stockItems.length === 0) {
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
      const party = await TradeDebtors.findById(transactionData.partyCode);
      if (!party || !party.isActive) {
        errors.push("Party not found or inactive");
      }
    }

    if (errors.length > 0) {
      throw createAppError(`Validation failed: ${errors.join(', ')}`, 400, "VALIDATION_ERROR");
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
        const transaction = await this.createMetalTransaction(transactionsData[i], adminId);
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
        failed: errors.length
      }
    };
  }
}

export default MetalTransactionService;