import MetalTransactionService from "../../services/modules/MetalTransactionService.js";
import { createAppError } from "../../utils/errorHandler.js";

export const createMetalTransaction = async (req, res, next) => {
  try {
    const {
      transactionType,
      voucherType,
      voucherDate,
      voucherNumber,
      partyCode,
      fix,
      unfix,
      partyCurrency,
      itemCurrency,
      baseCurrency,
      stockItems,
      totalAmountSession,
      status,
      notes,
    } = req.body;

    // Validation (already handled by middleware, but ensuring critical fields)
    if (
      !transactionType ||
      !partyCode ||
      !partyCurrency ||
      !stockItems ||
      !Array.isArray(stockItems) ||
      stockItems.length === 0
    ) {
      throw createAppError(
        "Required fields missing: transactionType, partyCode, partyCurrency, stockItems",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    if (!["purchase", "sale"].includes(transactionType)) {
      throw createAppError(
        "Invalid transaction type. Must be 'purchase' or 'sale'",
        400,
        "INVALID_TRANSACTION_TYPE"
      );
    }
    const Boolean = () => {
      if (fix === true || fix === "true") {
        return true;
      } else if (unfix === true || unfix === "true") {
        return true;
      }
      return false;
    };
    const transactionData = {
      transactionType,
      fix: Boolean(),
      unfix: Boolean(),
      voucherType: voucherType?.trim(),
      voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
      voucherNumber: voucherNumber?.trim(),
      partyCode: partyCode.trim(),
      partyCurrency: partyCurrency.trim(),
      itemCurrency: itemCurrency?.trim(),
      baseCurrency: baseCurrency?.trim(),
      stockItems: stockItems.map((item) => ({
        stockCode: item.stockCode.trim(),
        description: item.description?.trim(),
        pieces: Number(item.pieces || 0),
        grossWeight: Number(item.grossWeight || 0),
        purity: Number(item.purity),
        pureWeight: Number(item.pureWeight || 0),
        purityWeight: Number(item.purityWeight),
        weightInOz: Number(item.weightInOz),
        metalRate: item.metalRate.trim(),
        metalRateRequirements: {
          amount: Number(item.metalRateRequirements?.amount || 0),
          rate: Number(item.metalRateRequirements?.rate || 0),
        },
        makingCharges: {
          amount: Number(item.makingCharges?.amount || 0),
          rate: Number(item.makingCharges?.rate || 0),
        },
        premium: {
          amount: Number(item.premium?.amount || 0),
          rate: Number(item.premium?.rate || 0),
        },
        itemTotal: {
          baseAmount: Number(item.itemTotal?.baseAmount || 0),
          makingChargesTotal: Number(item.itemTotal?.makingChargesTotal || 0),
          premiumTotal: Number(item.itemTotal?.premiumTotal || 0),
          subTotal: Number(item.itemTotal?.subTotal || 0),
          vatAmount: Number(item.itemTotal?.vatAmount || 0),
          itemTotalAmount: Number(item.itemTotal?.itemTotalAmount || 0),
        },
        itemNotes: item.itemNotes?.trim(),
        itemStatus: item.itemStatus || "active",
      })),
      totalAmountSession: {
        totalAmountAED: Number(totalAmountSession?.totalAmountAED || 0),
        netAmountAED: Number(totalAmountSession?.netAmountAED || 0),
        vatAmount: Number(totalAmountSession?.vatAmount || 0),
        vatPercentage: Number(totalAmountSession?.vatPercentage || 0),
      },
      status: status || "draft",
      notes: notes?.trim(),
    };

    const metalTransaction =
      await MetalTransactionService.createMetalTransaction(
        transactionData,
        req.admin.id
      );

    res.status(201).json({
      success: true,
      message: `Metal ${transactionType} created successfully`,
      data: metalTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMetalTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      transactionType,
      partyCode,
      status,
      startDate,
      endDate,
      stockCode,
    } = req.query;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (partyCode) filters.partyCode = partyCode;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (stockCode) filters.stockCode = stockCode;

    const result = await MetalTransactionService.getAllMetalTransactions(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      message: "Metal transactions retrieved successfully",
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetalTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const metalTransaction =
      await MetalTransactionService.getMetalTransactionById(id);

    res.status(200).json({
      success: true,
      message: "Metal transaction retrieved successfully",
      data: metalTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMetalTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const updatedTransaction =
      await MetalTransactionService.updateMetalTransaction(
        id,
        updateData,
        req.admin.id
      );

    res.status(200).json({
      success: true,
      message: "Metal transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMetalTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const result = await MetalTransactionService.deleteMetalTransaction(
      id,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetalTransactionsByParty = async (req, res, next) => {
  try {
    const { partyId } = req.params;
    const { limit = 50, transactionType } = req.query;

    if (!partyId)
      throw createAppError("Party ID is required", 400, "MISSING_PARTY_ID");

    const transactions = await MetalTransactionService.getTransactionsByParty(
      partyId,
      parseInt(limit),
      transactionType
    );

    res.status(200).json({
      success: true,
      message: "Metal transactions by party retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionStatistics = async (req, res, next) => {
  try {
    const { transactionType, partyCode, startDate, endDate } = req.query;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (partyCode) filters.partyCode = partyCode;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await MetalTransactionService.getTransactionStatistics(
      filters
    );

    res.status(200).json({
      success: true,
      message: "Transaction statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransactionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );
    if (!status)
      throw createAppError("Status is required", 400, "MISSING_STATUS");

    const updatedTransaction =
      await MetalTransactionService.updateMetalTransaction(
        id,
        { status },
        req.admin.id
      );

    res.status(200).json({
      success: true,
      message: "Transaction status updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const addStockItemToTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stockItemData = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const updatedTransaction = await MetalTransactionService.addStockItem(
      id,
      stockItemData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Stock item added successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStockItemInTransaction = async (req, res, next) => {
  try {
    const { id, stockItemId } = req.params;
    const updateData = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );
    if (!stockItemId)
      throw createAppError(
        "Stock Item ID is required",
        400,
        "MISSING_STOCK_ITEM_ID"
      );

    const updatedTransaction = await MetalTransactionService.updateStockItem(
      id,
      stockItemId,
      updateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Stock item updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const removeStockItemFromTransaction = async (req, res, next) => {
  try {
    const { id, stockItemId } = req.params;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );
    if (!stockItemId)
      throw createAppError(
        "Stock Item ID is required",
        400,
        "MISSING_STOCK_ITEM_ID"
      );

    const updatedTransaction = await MetalTransactionService.removeStockItem(
      id,
      stockItemId,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Stock item removed successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSessionTotals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { totalAmountSession, vatPercentage } = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const updatedTransaction =
      await MetalTransactionService.updateSessionTotals(
        id,
        totalAmountSession,
        vatPercentage,
        req.admin.id
      );

    res.status(200).json({
      success: true,
      message: "Session totals updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const calculateSessionTotals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vatPercentage = 0 } = req.body;

    if (!id)
      throw createAppError(
        "Transaction ID is required",
        400,
        "MISSING_TRANSACTION_ID"
      );

    const updatedTransaction =
      await MetalTransactionService.calculateAndUpdateSessionTotals(
        id,
        vatPercentage,
        req.admin.id
      );

    res.status(200).json({
      success: true,
      message: "Session totals calculated and updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfitLossAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate, partyCode, stockCode } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (partyCode) filters.partyCode = partyCode;
    if (stockCode) filters.stockCode = stockCode;

    const analysis = await MetalTransactionService.getProfitLossAnalysis(
      filters
    );

    res.status(200).json({
      success: true,
      message: "Profit/Loss analysis retrieved successfully",
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};


export const getUnfixedTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, transactionType, partyCode, status, startDate, endDate } = req.query;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (partyCode) filters.partyCode = partyCode;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await MetalTransactionService.getUnfixedTransactions(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      message: "Unfixed transactions retrieved successfully",
      data: result.parties,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get unfixed transactions with detailed account information
export const getUnfixedTransactionsWithAccounts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, transactionType, partyCode, status, startDate, endDate } = req.query;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (partyCode) filters.partyCode = partyCode;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await MetalTransactionService.getUnfixedTransactionsWithAccounts(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      message: "Unfixed transactions with account details retrieved successfully",
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
