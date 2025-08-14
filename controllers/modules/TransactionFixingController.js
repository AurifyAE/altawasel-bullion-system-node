import { TransactionFixingService } from "../../services/modules/TransactionFixingService.js";
import { createAppError } from "../../utils/errorHandler.js";

// Create Transaction
export const createTransaction = async (req, res, next) => {
  try {
    const { partyId, price, quantityGm, type, metalType, notes, voucherCode, voucherType, prefix, goldBidValue } = req.body;

    // Validation
    if (!partyId || !quantityGm || !type || !metalType) {
      throw createAppError(
        "All required fields must be provided: partyId, value, quantityGm, type, metalType",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    if (isNaN(quantityGm) || quantityGm <= 0) {
      throw createAppError(
        "Quantity must be a positive number",
        400,
        "INVALID_QUANTITY"
      );
    }

    // Validate transaction type
    if (!["purchase", "sell"].includes(type.toLowerCase())) {
      throw createAppError(
        "Type must be either 'purchase' or 'sell'",
        400,
        "INVALID_TYPE"
      );
    }

    const transactionData = {
      partyId: partyId.trim(),
      quantityGm: parseFloat(quantityGm),
      type: type.toLowerCase(),
      metalType: metalType.trim(),
      price: parseFloat(price),
      voucherNumber: voucherCode,
      voucherType,
      goldBidValue
    };

    // Add optional fields if provided
    if (notes) transactionData.notes = notes.trim();

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

// Get all Transactions
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

    const result = await TransactionFixingService.getAllTransactions(
      page,
      limit,
      search,
      status,
      type,
      metalType,
      partyId
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

// Get Transaction by ID
export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.getTransactionById(id);

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// Update Transaction
export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { partyId, quantityGm, type, metalType, notes, status } = req.body;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    // Validation - at least one field should be provided
    if (!partyId && !quantityGm && !type && !metalType && !notes && !status) {
      throw createAppError(
        "At least one field is required to update",
        400,
        "NO_UPDATE_FIELDS"
      );
    }

    const updateData = {};
    if (partyId) updateData.partyId = partyId.trim();
    if (value !== undefined) {
      if (isNaN(value) || value <= 0) {
        throw createAppError(
          "Value must be a positive number",
          400,
          "INVALID_VALUE"
        );
      }
      updateData.value = parseFloat(value);
    }
    if (quantityGm !== undefined) {
      if (isNaN(quantityGm) || quantityGm <= 0) {
        throw createAppError(
          "Quantity must be a positive number",
          400,
          "INVALID_QUANTITY"
        );
      }
      updateData.quantityGm = parseFloat(quantityGm);
    }
    if (type) {
      if (!["purchase", "sell"].includes(type.toLowerCase())) {
        throw createAppError(
          "Type must be either 'purchase' or 'sell'",
          400,
          "INVALID_TYPE"
        );
      }
      updateData.type = type.toLowerCase();
    }
    if (metalType) updateData.metalType = metalType.trim();
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (status) updateData.status = status;

    const transaction = await TransactionFixingService.updateTransaction(
      id,
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

// Delete Transaction (Soft Delete)
export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.deleteTransaction(
      id,
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

// Cancel Transaction
export const cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.cancelTransaction(
      id,
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

// Permanently Delete Transaction
export const permanentDeleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const result = await TransactionFixingService.permanentDeleteTransaction(
      id
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Restore Transaction
export const restoreTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Transaction ID is required", 400, "MISSING_ID");
    }

    const transaction = await TransactionFixingService.restoreTransaction(
      id,
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

// Get Transactions by Party
export const getTransactionsByParty = async (req, res, next) => {
  try {
    const { partyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!partyId) {
      throw createAppError("Party ID is required", 400, "MISSING_PARTY_ID");
    }

    const transactions = await TransactionFixingService.getTransactionsByParty(
      partyId,
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

// Get Transactions by Metal Type
export const getTransactionsByMetal = async (req, res, next) => {
  try {
    const { metalType } = req.params;
    const { startDate, endDate } = req.query;

    if (!metalType) {
      throw createAppError("Metal type is required", 400, "MISSING_METAL_TYPE");
    }

    const transactions = await TransactionFixingService.getTransactionsByMetal(
      metalType,
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

// Get Party Metal Summary
export const getPartyMetalSummary = async (req, res, next) => {
  try {
    const { partyId, metalType } = req.params;

    if (!partyId || !metalType) {
      throw createAppError(
        "Party ID and Metal type are required",
        400,
        "MISSING_PARAMETERS"
      );
    }

    const summary = await TransactionFixingService.getPartyMetalSummary(
      partyId,
      metalType
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
