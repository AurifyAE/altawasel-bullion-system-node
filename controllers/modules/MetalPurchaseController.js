import MetalPurchaseService from "../../services/modules/MetalPurchaseService.js";
import { createAppError } from "../../utils/errorHandler.js";

export const createMetalPurchase = async (req, res, next) => {
  try {
    const {
      fixed,
      unfix,
      voucherType,
      voucherDate,
      partyCode,
      partyCurrency,
      itemCurrency,
      subLedger,
      metalRate,
      crDays,
      creditDays,
      baseCurrency,
      stockCode,
      description,
      pieces,
      grossWeight,
      purity,
      purityWeight,
      weightInOz,
      purityDiff,
      metalRateRequirements,
      makingCharges,
      premium,
      totalAmountSession,
      status,
      notes
    } = req.body;

    // Validation
    if (
      !partyCode ||
      !partyCurrency ||
      !itemCurrency ||
      !metalRate ||
      !stockCode ||
      !description ||
      grossWeight === undefined ||
      purity === undefined
    ) {
      throw createAppError(
        "Required fields missing: partyCode, partyCurrency, itemCurrency, metalRate, stockCode, description, pieces, grossWeight, purity",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    // Validate numeric values
    if (grossWeight < 0 || purity < 0 || purity > 100) {
      throw createAppError(
        "Invalid numeric values: pieces, grossWeight must be non-negative, purity must be between 0-100",
        400,
        "INVALID_NUMERIC_VALUES"
      );
    }

    const purchaseData = {
      fixed: fixed || false,
      unfix: unfix || false,
      voucherType: voucherType?.trim(),
      voucherDate: voucherDate ? new Date(voucherDate) : null,
      partyCode: partyCode.trim(),
      partyCurrency: partyCurrency.trim(),
      itemCurrency: itemCurrency.trim(),
      subLedger: subLedger?.trim(),
      metalRate: metalRate.trim(),
      crDays: crDays || 0,
      creditDays: creditDays || 0,
      baseCurrency: baseCurrency?.trim(),
      stockCode: stockCode.trim(),
      description: description.trim(),
      pieces: Number(pieces),
      grossWeight: Number(grossWeight),
      purity: Number(purity),
      purityWeight: purityWeight ? Number(purityWeight) : undefined,
      weightInOz: weightInOz ? Number(weightInOz) : undefined,
      purityDiff: purityDiff ? Number(purityDiff) : 0,
      metalRateRequirements: {
        rateType: metalRateRequirements?.rateType.trim() || "spot",
        rate: Number(metalRateRequirements?.rate || 0),
        amount: Number(metalRateRequirements?.amount || 0)
      },
      makingCharges: {
        units: Number(makingCharges?.units || 0),
        rate: Number(makingCharges?.rate || 0),
        amount: Number(makingCharges?.amount || 0)
      },
      premium: {
        currency: premium?.currency?.trim(),
        amount: Number(premium?.amount || 0),
        rate: Number(premium?.rate || 0)
      },
      totalAmountSession: {
        totalAmountAED: Number(totalAmountSession?.totalAmountAED || 0),
        netAmountAED: Number(totalAmountSession?.netAmountAED || 0),
        vatAmount: Number(totalAmountSession?.vatAmount || 0),
        vatPercentage: Number(totalAmountSession?.vatPercentage || 0)
      },
      status: status || "draft",
      notes: notes?.trim()
    };

    const metalPurchase = await MetalPurchaseService.createMetalPurchase(
      purchaseData,
      req.admin.id
    );

    res.status(201).json({
      success: true,
      message: "Metal purchase created successfully",
      data: metalPurchase,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMetalPurchases = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      partyCode,
      status,
      startDate,
      endDate
    } = req.query;

    const filters = {};
    if (partyCode) filters.partyCode = partyCode;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await MetalPurchaseService.getAllMetalPurchases(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      message: "Metal purchases retrieved successfully",
      data: result.purchases,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetalPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Purchase ID is required", 400, "MISSING_PURCHASE_ID");
    }

    const metalPurchase = await MetalPurchaseService.getMetalPurchaseById(id);

    res.status(200).json({
      success: true,
      message: "Metal purchase retrieved successfully",
      data: metalPurchase,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMetalPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw createAppError("Purchase ID is required", 400, "MISSING_PURCHASE_ID");
    }

    // Validate numeric values if provided
    if (updateData.pieces !== undefined && updateData.pieces < 0) {
      throw createAppError("Pieces cannot be negative", 400, "INVALID_PIECES");
    }
    if (updateData.grossWeight !== undefined && updateData.grossWeight < 0) {
      throw createAppError("Gross weight cannot be negative", 400, "INVALID_GROSS_WEIGHT");
    }
    if (updateData.purity !== undefined && (updateData.purity < 0 || updateData.purity > 100)) {
      throw createAppError("Purity must be between 0-100", 400, "INVALID_PURITY");
    }

    // Clean and format update data
    const cleanedUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        if (typeof updateData[key] === 'string') {
          cleanedUpdateData[key] = updateData[key].trim();
        } else {
          cleanedUpdateData[key] = updateData[key];
        }
      }
    });

    const updatedPurchase = await MetalPurchaseService.updateMetalPurchase(
      id,
      cleanedUpdateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Metal purchase updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMetalPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Purchase ID is required", 400, "MISSING_PURCHASE_ID");
    }

    const result = await MetalPurchaseService.deleteMetalPurchase(id, req.admin.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetalPurchasesByParty = async (req, res, next) => {
  try {
    const { partyId } = req.params;
    const { limit = 50 } = req.query;

    if (!partyId) {
      throw createAppError("Party ID is required", 400, "MISSING_PARTY_ID");
    }

    const purchases = await MetalPurchaseService.getPurchasesByParty(
      partyId,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: "Metal purchases by party retrieved successfully",
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseStatistics = async (req, res, next) => {
  try {
    const { partyCode, startDate, endDate } = req.query;

    const filters = {};
    if (partyCode) filters.partyCode = partyCode;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await MetalPurchaseService.getPurchaseStatistics(filters);

    res.status(200).json({
      success: true,
      message: "Purchase statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      throw createAppError("Purchase ID is required", 400, "MISSING_PURCHASE_ID");
    }

    if (!status) {
      throw createAppError("Status is required", 400, "MISSING_STATUS");
    }

    const validStatuses = ["draft", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw createAppError(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400,
        "INVALID_STATUS"
      );
    }

    const updatedPurchase = await MetalPurchaseService.updateMetalPurchase(
      id,
      { status },
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Purchase status updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    next(error);
  }
};