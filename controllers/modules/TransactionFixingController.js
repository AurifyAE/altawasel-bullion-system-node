/**
 * Transaction Controller
 * Handles all transaction-related HTTP requests
 */
import { TransactionFixingService } from "../../services/modules/TransactionFixingService.js";
import { createAppError } from "../../utils/errorHandler.js";

// Validation constants
const VALID_TRANSACTION_TYPES = ["PURCHASE", "SELL"];
const DEFAULT_PREFIX = "PF";
const DEFAULT_PAYMENT_TERMS = "Cash";
const DEFAULT_SALESMAN = "N/A";

// Helper function to validate transaction data
const validateTransactionData = (data, isUpdate = false) => {
  if (!isUpdate && !data.partyId) {
    throw createAppError(
      "Party ID is required",
      400,
      "REQUIRED_FIELDS_MISSING"
    );
  }

  if (data.type && !VALID_TRANSACTION_TYPES.includes(data.type.toUpperCase())) {
    throw createAppError(
      "Type must be either 'PURCHASE' or 'SELL'",
      400,
      "INVALID_TYPE"
    );
  }

  if (data.orders && !Array.isArray(data.orders)) {
    throw createAppError(
      "Orders must be an array",
      400,
      "INVALID_ORDERS_FORMAT"
    );
  }
};

/**
 * Create a new transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createTransaction = async (req, res, next) => {
  try {
    const {
      partyId,
      salesman = DEFAULT_SALESMAN,
      paymentTerms = DEFAULT_PAYMENT_TERMS,
      type,
      orders,
      voucherCode,
      voucherType,
      prefix = DEFAULT_PREFIX,
      goldBidValue,
    } = req.body;

    const transactionData = {
      partyId: partyId?.trim(),
      type: type?.toUpperCase(),
      voucherNumber: voucherCode || null,
      voucherType,
      prefix,
      salesman,
      paymentTerms,
      orders: orders?.map(order => ({
        quantityGm: parseFloat(order.quantityGm) || 0,
        notes: order.notes?.trim() || "",
        price: parseFloat(order.price) || 0,
        goldBidValue: parseFloat(order.goldBidValue) || 0,
        metalType: order.metalType?.trim(),
        paymentTerms: order.paymentTerms || DEFAULT_PAYMENT_TERMS,
      })) || [],
    };

    validateTransactionData(transactionData);

    const transaction = await TransactionFixingService.createTransaction(
      transactionData,
      req.admin.id
    );

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      type = "",
      metalType = "",
      partyId = "",
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedPage) || parsedPage < 1) {
      throw createAppError("Invalid page number", 400, "INVALID_PAGE");
    }

    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw createAppError("Invalid limit value", 400, "INVALID_LIMIT");
    }

    const result = await TransactionFixingService.getAllTransactions(
      parsedPage,
      parsedLimit,
      search.trim(),
      status,
      type.toUpperCase(),
      metalType.trim(),
      partyId.trim()
    );

    res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.getTransactionById(id.trim());

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { partyId, quantityGm, type, metalType, notes, status, value } = req.body;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const updateData = {};
    if (partyId) updateData.partyId = partyId.trim();
    if (value !== undefined) {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw createAppError(
          "Value must be a positive number",
          400,
          "INVALID_VALUE"
        );
      }
      updateData.value = parsedValue;
    }
    if (quantityGm !== undefined) {
      const parsedQuantity = parseFloat(quantityGm);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw createAppError(
          "Quantity must be a positive number",
          400,
          "INVALID_QUANTITY"
        );
      }
      updateData.quantityGm = parsedQuantity;
    }
    if (type) updateData.type = type.toUpperCase();
    if (metalType) updateData.metalType = metalType.trim();
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (status) updateData.status = status;

    validateTransactionData(updateData, true);

    if (Object.keys(updateData).length === 0) {
      throw createAppError(
        "At least one field is required to update",
        400,
        "NO_UPDATE_FIELDS"
      );
    }

    const transaction = await TransactionFixingService.updateTransaction(
      id.trim(),
      updateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete a transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.deleteTransaction(
      id.trim(),
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a transaction
 * @param {Object}books:1-10
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.cancelTransaction(
      id.trim(),
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Transaction cancelled successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete a transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const permanentDeleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const result = await TransactionFixingService.permanentDeleteTransaction(id.trim());

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore a soft-deleted transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const restoreTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.restoreTransaction(
      id.trim(),
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Transaction restored successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transactions by party ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getTransactionsByParty = async (req, res, next) => {
  try {
    const { partyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!partyId?.trim()) {
      throw createAppError("Party ID is required", 400, "MISSING_PARTY_ID");
    }

    const transactions = await TransactionFixingService.getTransactionsByParty(
      partyId.trim(),
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      message: "Party transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transactions by metal type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getTransactionsByMetal = async (req, res, next) => {
  try {
    const { metalType } = req.params;
    const { startDate, endDate } = req.query;

    if (!metalType?.trim()) {
      throw createAppError("Metal type is required", 400, "MISSING_METAL_TYPE");
    }

    const transactions = await TransactionFixingService.getTransactionsByMetal(
      metalType.trim(),
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      message: "Metal transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get party metal summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getPartyMetalSummary = async (req, res, next) => {
  try {
    const { partyId, metalType } = req.params;

    if (!partyId?.trim() || !metalType?.trim()) {
      throw createAppError(
        "Party ID and Metal type are required",
        400,
        "MISSING_PARAMETERS"
      );
    }

    const summary = await TransactionFixingService.getPartyMetalSummary(
      partyId.trim(),
      metalType.trim()
    );

    res.status(200).json({
      success: true,
      message: "Party metal summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};