import MetalPurchase from "../../models/modules/MetalPurchase.js";
import Registry from "../../models/modules/Registry.js";
import TradeDebtors from "../../models/modules/TradeDebtors.js";
import { createAppError } from "../../utils/errorHandler.js";
import mongoose from "mongoose";

class MetalPurchaseService {
  // Create new metal purchase
static async createMetalPurchase(purchaseData, adminId) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      // Validate party exists and is active
      const party = await TradeDebtors.findById(purchaseData.partyCode);
      if (!party || !party.isActive) {
        throw createAppError("Party not found or inactive", 400, "INVALID_PARTY");
      }

      // Create metal purchase
      const metalPurchase = new MetalPurchase({
        ...purchaseData,
        createdBy: adminId
      });

      await metalPurchase.save({ session });

      // Create registry entries for gold balance
      const registryEntries = [];

      // 1. Gold registry entry (Debit - Purity Weight)
      if (metalPurchase.purityWeight > 0) {
        const goldRegistry = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter ? party.costCenter : null,
          type: "gold",
          description: `Metal Purchase - ${metalPurchase.stockCode} - Purity Weight`,
          value: metalPurchase.purityWeight,
          debit: metalPurchase.purityWeight,
          credit: 0,
          transactionDate: metalPurchase.voucherDate || new Date(),
          reference: metalPurchase._id.toString(),
          createdBy: adminId
        });
        registryEntries.push(goldRegistry);
      }

      // 2. Making charges registry entry (Debit)
      if (metalPurchase.makingCharges.amount > 0) {
        const makingChargesRegistry = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "making_charges",
          description: `Metal Purchase - Making Charges - ${metalPurchase.stockCode}`,
          value: metalPurchase.makingCharges.amount,
          debit: metalPurchase.makingCharges.amount,
          credit: 0,
          transactionDate: metalPurchase.voucherDate || new Date(),
          reference: metalPurchase._id.toString(),
          createdBy: adminId
        });
        registryEntries.push(makingChargesRegistry);
      }

      // 3. Premium/Discount registry entry
      if (metalPurchase.premium.amount !== 0) {
        const isPremium = metalPurchase.premium.amount > 0;
        const isDiscount = metalPurchase.premium.amount < 0;
        const absoluteAmount = Math.abs(metalPurchase.premium.amount);
        
        let description, type, debit, credit;
        
        if (isPremium) {
          // Premium - Debit entry (cost to business)
          description = `Metal Purchase - Premium - ${metalPurchase.stockCode}`;
          type = "premium_discount";
          debit = absoluteAmount;
          credit = 0;
        } else if (isDiscount) {
          // Discount - Credit entry (benefit to business)
          description = `Metal Purchase - Discount - ${metalPurchase.stockCode}`;
          type = "premium_discount";
          debit = 0;
          credit = absoluteAmount;
        }

        const premiumDiscountRegistry = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: type,
          description: description,
          value: absoluteAmount,
          debit: debit,
          credit: credit,
          transactionDate: metalPurchase.voucherDate || new Date(),
          reference: metalPurchase._id.toString(),
          createdBy: adminId
        });
        registryEntries.push(premiumDiscountRegistry);
      }

      // Save all registry entries
      if (registryEntries.length > 0) {
        await Registry.insertMany(registryEntries, { session });
      }

      // Update TradeDebtors balances
      await this.updateTradeDebtorsBalance(party._id, metalPurchase, session);

      await session.commitTransaction();

      // Populate and return the created purchase
      return await MetalPurchase.findById(metalPurchase._id)
        .populate('partyCode', 'name code')
        .populate('partyCurrency', 'code symbol')
        .populate('itemCurrency', 'code symbol')
        .populate('stockCode', 'code description')
        .populate('metalRate', 'metalType rate');

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get all metal purchases with pagination
  static async getAllMetalPurchases(page = 1, limit = 50, filters = {}) {
    const skip = (page - 1) * limit;
    const query = { isActive: true };

    // Apply filters
    if (filters.partyCode) {
      query.partyCode = filters.partyCode;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.startDate && filters.endDate) {
      query.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const purchases = await MetalPurchase.find(query)
      .populate('partyCode', 'name code')
      .populate('partyCurrency', 'code symbol')
      .populate('itemCurrency', 'code symbol')
      .populate('stockCode', 'code description')
      .populate('metalRate', 'metalType rate')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MetalPurchase.countDocuments(query);

    return {
      purchases,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  // Get metal purchase by ID
  static async getMetalPurchaseById(purchaseId) {
    const purchase = await MetalPurchase.findById(purchaseId)
      .populate('partyCode', 'name code email phone')
      .populate('partyCurrency', 'code symbol')
      .populate('itemCurrency', 'code symbol')
      .populate('baseCurrency', 'code symbol')
      .populate('stockCode', 'code description specifications')
      .populate('description', 'description')
      .populate('metalRate', 'metalType rate effectiveDate')
      .populate('premium.currency', 'code symbol')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!purchase || !purchase.isActive) {
      throw createAppError("Metal purchase not found", 404, "PURCHASE_NOT_FOUND");
    }

    return purchase;
  }

  // Update metal purchase
  static async updateMetalPurchase(purchaseId, updateData, adminId) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      const existingPurchase = await MetalPurchase.findById(purchaseId);
      if (!existingPurchase || !existingPurchase.isActive) {
        throw createAppError("Metal purchase not found", 404, "PURCHASE_NOT_FOUND");
      }

      // Store old values for registry adjustment
      const oldPurityWeight = existingPurchase.purityWeight;
      const oldMakingCharges = existingPurchase.makingCharges.amount;
      const oldPremium = existingPurchase.premium.amount;

      // Update the purchase
      const updatedPurchase = await MetalPurchase.findByIdAndUpdate(
        purchaseId,
        {
          ...updateData,
          updatedBy: adminId
        },
        { new: true, session }
      );

      // If amounts changed, update registry entries
      const purityWeightDiff = updatedPurchase.purityWeight - oldPurityWeight;
      const makingChargesDiff = updatedPurchase.makingCharges.amount - oldMakingCharges;
      const premiumDiff = updatedPurchase.premium.amount - oldPremium;

      const party = await TradeDebtors.findById(updatedPurchase.partyCode);

      // Create adjustment registry entries
      const adjustmentEntries = [];

      if (purityWeightDiff !== 0) {
        const goldAdjustment = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "gold",
          description: `Metal Purchase Update - Gold Adjustment - ${updatedPurchase.stockCode}`,
          value: Math.abs(purityWeightDiff),
          debit: purityWeightDiff > 0 ? purityWeightDiff : 0,
          credit: purityWeightDiff < 0 ? Math.abs(purityWeightDiff) : 0,
          transactionDate: new Date(),
          reference: `${purchaseId}-adjustment`,
          createdBy: adminId
        });
        adjustmentEntries.push(goldAdjustment);
      }

      if (makingChargesDiff !== 0) {
        const makingAdjustment = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "making_charges",
          description: `Metal Purchase Update - Making Charges Adjustment`,
          value: Math.abs(makingChargesDiff),
          debit: makingChargesDiff > 0 ? makingChargesDiff : 0,
          credit: makingChargesDiff < 0 ? Math.abs(makingChargesDiff) : 0,
          transactionDate: new Date(),
          reference: `${purchaseId}-adjustment`,
          createdBy: adminId
        });
        adjustmentEntries.push(makingAdjustment);
      }

      if (premiumDiff !== 0) {
        const premiumAdjustment = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "premium",
          description: `Metal Purchase Update - Premium Adjustment`,
          value: Math.abs(premiumDiff),
          debit: premiumDiff > 0 ? premiumDiff : 0,
          credit: premiumDiff < 0 ? Math.abs(premiumDiff) : 0,
          transactionDate: new Date(),
          reference: `${purchaseId}-adjustment`,
          createdBy: adminId
        });
        adjustmentEntries.push(premiumAdjustment);
      }

      if (adjustmentEntries.length > 0) {
        await Registry.insertMany(adjustmentEntries, { session });
        
        // Update TradeDebtors balance
        await this.updateTradeDebtorsBalance(party._id, updatedPurchase, session, true);
      }

      await session.commitTransaction();

      return await this.getMetalPurchaseById(purchaseId);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Delete metal purchase (soft delete)
  static async deleteMetalPurchase(purchaseId, adminId) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      const purchase = await MetalPurchase.findById(purchaseId);
      if (!purchase || !purchase.isActive) {
        throw createAppError("Metal purchase not found", 404, "PURCHASE_NOT_FOUND");
      }

      // Soft delete the purchase
      await MetalPurchase.findByIdAndUpdate(
        purchaseId,
        {
          isActive: false,
          status: 'cancelled',
          updatedBy: adminId
        },
        { session }
      );

      // Create reversal registry entries
      const party = await TradeDebtors.findById(purchase.partyCode);
      const reversalEntries = [];

      // Reverse gold entry
      if (purchase.purityWeight > 0) {
        const goldReversal = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "gold",
          description: `Metal Purchase Cancellation - Gold Reversal - ${purchase.stockCode}`,
          value: purchase.purityWeight,
          debit: 0,
          credit: purchase.purityWeight,
          transactionDate: new Date(),
          reference: `${purchaseId}-cancellation`,
          createdBy: adminId
        });
        reversalEntries.push(goldReversal);
      }

      // Reverse making charges
      if (purchase.makingCharges.amount > 0) {
        const makingReversal = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "making_charges",
          description: `Metal Purchase Cancellation - Making Charges Reversal`,
          value: purchase.makingCharges.amount,
          debit: 0,
          credit: purchase.makingCharges.amount,
          transactionDate: new Date(),
          reference: `${purchaseId}-cancellation`,
          createdBy: adminId
        });
        reversalEntries.push(makingReversal);
      }

      // Reverse premium
      if (purchase.premium.amount > 0) {
        const premiumReversal = new Registry({
          transactionId: await Registry.generateTransactionId(),
          costCenter: party.costCenter,
          type: "premium",
          description: `Metal Purchase Cancellation - Premium Reversal`,
          value: purchase.premium.amount,
          debit: 0,
          credit: purchase.premium.amount,
          transactionDate: new Date(),
          reference: `${purchaseId}-cancellation`,
          createdBy: adminId
        });
        reversalEntries.push(premiumReversal);
      }

      if (reversalEntries.length > 0) {
        await Registry.insertMany(reversalEntries, { session });
        
        // Update TradeDebtors balance (reversal)
        await this.updateTradeDebtorsBalance(party._id, purchase, session, false, true);
      }

      await session.commitTransaction();
      return { message: "Metal purchase deleted successfully" };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Update TradeDebtors balance
  static async updateTradeDebtorsBalance(partyId, purchase, session, isUpdate = false, isReversal = false) {
    const party = await TradeDebtors.findById(partyId).session(session);
    
    // Calculate multiplier for operations
    let multiplier = 1;
    if (isReversal) multiplier = -1;

    // Update gold balance
    if (purchase.purityWeight > 0) {
      party.balances.goldBalance.totalGrams += (purchase.purityWeight * multiplier);
      party.balances.goldBalance.totalValue += (purchase.metalRateRequirements.amount * multiplier);
      party.balances.goldBalance.lastUpdated = new Date();
    }

    // Update cash balance (for making charges and premium)
    const totalCharges = (purchase.makingCharges.amount + purchase.premium.amount) * multiplier;
    if (totalCharges !== 0) {
      // Find existing currency balance or create new one
      let currencyBalance = party.balances.cashBalance.find(
        cb => cb.currency.toString() === purchase.partyCurrency.toString()
      );

      if (!currencyBalance) {
        currencyBalance = {
          currency: purchase.partyCurrency,
          amount: 0,
          lastUpdated: new Date()
        };
        party.balances.cashBalance.push(currencyBalance);
      }

      currencyBalance.amount += totalCharges;
      currencyBalance.lastUpdated = new Date();
    }

    // Update total outstanding
    party.balances.totalOutstanding += (purchase.totalAmountSession.totalAmountAED * multiplier);
    party.balances.lastBalanceUpdate = new Date();

    await party.save({ session });
  }

  // Get purchase statistics
  static async getPurchaseStatistics(filters = {}) {
    const matchCondition = { isActive: true };
    
    if (filters.partyCode) {
      matchCondition.partyCode = new mongoose.Types.ObjectId(filters.partyCode);
    }
    
    if (filters.startDate && filters.endDate) {
      matchCondition.voucherDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const stats = await MetalPurchase.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: '$totalAmountSession.totalAmountAED' },
          totalWeight: { $sum: '$purityWeight' },
          totalPieces: { $sum: '$pieces' },
          avgPurchaseValue: { $avg: '$totalAmountSession.totalAmountAED' },
          avgWeight: { $avg: '$purityWeight' }
        }
      }
    ]);

    return stats[0] || {
      totalPurchases: 0,
      totalAmount: 0,
      totalWeight: 0,
      totalPieces: 0,
      avgPurchaseValue: 0,
      avgWeight: 0
    };
  }
}

export default MetalPurchaseService;