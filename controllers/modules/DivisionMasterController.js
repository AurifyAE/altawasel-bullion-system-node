import { DivisionMasterService } from "../../services/modules/DivisionMasterService.js";
import { createAppError } from "../../utils/errorHandler.js";

// Get all divisions
export const getAllDivisions = async (req, res, next) => {
  try {
    // Use validatedQuery instead of req.query for validated parameters
    const queryParams = req.validatedQuery || req.query;
    const { page = 1, limit = 10, status, isActive, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;

    const filters = {};
    if (status) filters.status = status;
    if (isActive !== undefined) filters.isActive = isActive === "true";
    if (search) filters.search = search;
    if (sortBy) filters.sortBy = sortBy;
    if (sortOrder) filters.sortOrder = sortOrder;

    const result = await DivisionMasterService.getAllDivisions(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.status(200).json({
      success: true,
      message: "Divisions fetched successfully",
      data: result.divisions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get division by ID
export const getDivisionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const division = await DivisionMasterService.getDivisionById(id);

    res.status(200).json({
      success: true,
      message: "Division fetched successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Get division by code
export const getDivisionByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const division = await DivisionMasterService.getDivisionByCode(code);

    res.status(200).json({
      success: true,
      message: "Division fetched successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Create new division
export const createDivision = async (req, res, next) => {
  try {
    const {
      code,
      description,
      costCenter,
      costCenterMaking,
      autoFixStockCode,
    } = req.body;

    // Validation
    if (
      !code ||
      !description ||
      !costCenter ||
      !costCenterMaking ||
      !autoFixStockCode
    ) {
      throw createAppError(
        "All fields are required: code, description, costCenter, costCenterMaking, autoFixStockCode",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    const divisionData = {
      code: code.trim(),
      description: description.trim(),
      costCenter: costCenter.trim(),
      costCenterMaking: costCenterMaking.trim(),
      autoFixStockCode: autoFixStockCode.trim(),
    };

    const division = await DivisionMasterService.createDivision(
      divisionData,
      req.admin.id
    );

    res.status(201).json({
      success: true,
      message: "Division created successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Update division
export const updateDivision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove empty fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === "" || updateData[key] == null) {
        delete updateData[key];
      } else if (typeof updateData[key] === "string") {
        updateData[key] = updateData[key].trim();
      }
    });

    if (Object.keys(updateData).length === 0) {
      throw createAppError(
        "No valid fields to update",
        400,
        "NO_UPDATE_FIELDS"
      );
    }

    const division = await DivisionMasterService.updateDivision(
      id,
      updateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Division updated successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Soft delete division
export const deleteDivision = async (req, res, next) => {
  try {
    const { id } = req.params;

    const division = await DivisionMasterService.deleteDivision(
      id,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Division deleted successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Permanent delete division
export const permanentDeleteDivision = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await DivisionMasterService.permanentDeleteDivision(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Activate division
export const activateDivision = async (req, res, next) => {
  try {
    const { id } = req.params;

    const division = await DivisionMasterService.activateDivision(
      id,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Division activated successfully",
      data: division,
    });
  } catch (error) {
    next(error);
  }
};

// Get division statistics
export const getDivisionStats = async (req, res, next) => {
  try {
    const stats = await DivisionMasterService.getDivisionStats();

    res.status(200).json({
      success: true,
      message: "Division statistics fetched successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk operations
export const bulkDeleteDivisions = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createAppError("Invalid or empty IDs array", 400, "INVALID_IDS");
    }

    const results = await Promise.allSettled(
      ids.map((id) => DivisionMasterService.deleteDivision(id, req.admin.id))
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );
    const failed = results.filter((result) => result.status === "rejected");

    res.status(200).json({
      success: true,
      message: `Bulk delete completed. ${successful.length} successful, ${failed.length} failed`,
      data: {
        successful: successful.length,
        failed: failed.length,
        failedItems: failed.map((item, index) => ({
          id: ids[results.indexOf(item)],
          error: item.reason.message,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkActivateDivisions = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createAppError("Invalid or empty IDs array", 400, "INVALID_IDS");
    }

    const results = await Promise.allSettled(
      ids.map((id) => DivisionMasterService.activateDivision(id, req.admin.id))
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );
    const failed = results.filter((result) => result.status === "rejected");

    res.status(200).json({
      success: true,
      message: `Bulk activation completed. ${successful.length} successful, ${failed.length} failed`,
      data: {
        successful: successful.length,
        failed: failed.length,
        failedItems: failed.map((item, index) => ({
          id: ids[results.indexOf(item)],
          error: item.reason.message,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
