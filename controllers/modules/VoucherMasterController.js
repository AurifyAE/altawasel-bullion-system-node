import { createAppError } from "../../utils/errorHandler.js";
import VoucherMasterService from "../../services/modules/VoucherMasterService.js";

// Create voucher
export const createVoucher = async (req, res, next) => {
  try {
    const {
      code,
      description,
      voucherType,
      prefix,
      nextNumber,
      numberLength,
      dateFormat,
      isAutoIncrement
    } = req.body;

    // Validation
    if (!code || !description || !voucherType || !prefix) {
      throw createAppError(
        "All required fields must be provided: code, description, voucherType, prefix",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    const voucherData = {
      code: code.trim(),
      description: description.trim(),
      voucherType: voucherType.trim(),
      prefix: prefix.trim(),
      nextNumber: nextNumber || 1,
      numberLength: numberLength || 4,
      dateFormat: dateFormat || "DD/MM/YYYY",
      isAutoIncrement: isAutoIncrement !== undefined ? isAutoIncrement : true
    };

    const voucher = await VoucherMasterService.createVoucher(
      voucherData,
      req.admin.id
    );

    res.status(201).json({
      success: true,
      message: "Voucher created successfully",
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Get all vouchers
export const getAllVouchers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      status: req.query.status,
      isActive: req.query.isActive,
      voucherType: req.query.voucherType,
      search: req.query.search
    };

    const result = await VoucherMasterService.getAllVouchers(page, limit, filters);

    res.status(200).json({
      success: true,
      message: "Vouchers retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get voucher by ID
export const getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Voucher ID is required", 400, "MISSING_ID");
    }

    const voucher = await VoucherMasterService.getVoucherById(id);

    res.status(200).json({
      success: true,
      message: "Voucher retrieved successfully",
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Update voucher
export const updateVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw createAppError("Voucher ID is required", 400, "MISSING_ID");
    }

    if (Object.keys(updateData).length === 0) {
      throw createAppError("Update data is required", 400, "NO_UPDATE_DATA");
    }

    // Clean update data
    const cleanUpdateData = {};
    const allowedFields = [
      'code', 'description', 'voucherType', 'prefix', 
      'nextNumber', 'numberLength', 'dateFormat', 
      'isAutoIncrement', 'isActive', 'status'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] === 'string') {
          cleanUpdateData[field] = updateData[field].trim();
        } else {
          cleanUpdateData[field] = updateData[field];
        }
      }
    });

    const voucher = await VoucherMasterService.updateVoucher(
      id,
      cleanUpdateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Voucher updated successfully",
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Delete voucher (soft delete)
export const deleteVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Voucher ID is required", 400, "MISSING_ID");
    }

    const voucher = await VoucherMasterService.deleteVoucher(id, req.admin.id);

    res.status(200).json({
      success: true,
      message: "Voucher deleted successfully",
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Hard delete voucher
export const hardDeleteVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Voucher ID is required", 400, "MISSING_ID");
    }

    const result = await VoucherMasterService.hardDeleteVoucher(id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// Get vouchers by type
export const getVouchersByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!type) {
      throw createAppError("Voucher type is required", 400, "MISSING_TYPE");
    }

    const vouchers = await VoucherMasterService.getVouchersByType(type);

    res.status(200).json({
      success: true,
      message: "Vouchers retrieved successfully",
      data: vouchers
    });
  } catch (error) {
    next(error);
  }
};

// Generate voucher number
export const generateVoucherNumber = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError("Voucher ID is required", 400, "MISSING_ID");
    }

    const result = await VoucherMasterService.generateVoucherNumber(id);

    res.status(200).json({
      success: true,
      message: "Voucher number generated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};