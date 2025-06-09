import { createAppError } from "../../utils/errorHandler.js";
import MetalStockService from "../../services/modules/MetalStockService.js";

// Create new metal stock
export const createMetalStock = async (req, res, next) => {
  try {
    const {
      metalType,
      code,
      description,
      branch,
      karat,
      standardPurity,
      premiumDiscount,
      charges,
      makingCharge,
      unit,
      costCenter,
      category,
      subCategory,
      type,
      size,
      color,
      brand,
      country,
      price,
   
    } = req.body;

    // Validation for required fields
    if (
      !metalType ||
      !code ||
      !description ||
    //   !branch ||
      !karat ||
      standardPurity === undefined ||
      !unit ||
    //   !costCenter ||
      !category ||
      !subCategory ||
      !type
    ) {
      throw createAppError(
        "Required fields missing: metalType, code, description, branch, karat, standardPurity, unit, costCenter, category, subCategory, type",
        400,
        "REQUIRED_FIELDS_MISSING"
      );
    }

    // Validate standardPurity range
    if (standardPurity < 0 || standardPurity > 100) {
      throw createAppError(
        "Standard purity must be between 0 and 100",
        400,
        "INVALID_PURITY_RANGE"
      );
    }

    const metalStockData = {
      metalType: metalType.trim(),
      code: code.trim(),
      description: description.trim(),
    //   branch: branch.trim(),
      karat: karat.trim(),
      standardPurity: parseFloat(standardPurity),
      premiumDiscount: premiumDiscount ? parseFloat(premiumDiscount) : 0,
      charges: charges || null,
      makingCharge: makingCharge || null,
      unit: unit.trim(),
    //   costCenter: costCenter.trim(),
      category: category.trim(),
      subCategory: subCategory.trim(),
      type: type.trim(),
      size: size || null,
      color: color || null,
      brand: brand || null,
      country: country || null,
      price: price || null,

    };

    const metalStock = await MetalStockService.createMetalStock(
      metalStockData,
      req.admin.id
    );

    res.status(201).json({
      success: true,
      message: "Metal stock created successfully",
      data: metalStock
    });
  } catch (error) {
    next(error);
  }
};

// Get all metal stocks with pagination and filters
export const getAllMetalStocks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      metalType,
      branch,
      category,
      status,
      isActive,
      sortBy,
      sortOrder
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      metalType,
      branch,
      category,
      status,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      sortBy,
      sortOrder
    };

    const result = await MetalStockService.getAllMetalStocks(options);

    res.status(200).json({
      success: true,
      message: "Metal stocks fetched successfully",
      data: result.metalStocks,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// Get metal stock by ID
export const getMetalStockById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError(
        "Metal stock ID is required",
        400,
        "MISSING_ID"
      );
    }

    const metalStock = await MetalStockService.getMetalStockById(id);

    res.status(200).json({
      success: true,
      message: "Metal stock fetched successfully",
      data: metalStock
    });
  } catch (error) {
    next(error);
  }
};

// Update metal stock
export const updateMetalStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw createAppError(
        "Metal stock ID is required",
        400,
        "MISSING_ID"
      );
    }

    // Validate standardPurity if provided
    if (updateData.standardPurity !== undefined) {
      if (updateData.standardPurity < 0 || updateData.standardPurity > 100) {
        throw createAppError(
          "Standard purity must be between 0 and 100",
          400,
          "INVALID_PURITY_RANGE"
        );
      }
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

    const updatedMetalStock = await MetalStockService.updateMetalStock(
      id,
      cleanedUpdateData,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Metal stock updated successfully",
      data: updatedMetalStock
    });
  } catch (error) {
    next(error);
  }
};

// Delete metal stock (soft delete)
export const deleteMetalStock = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError(
        "Metal stock ID is required",
        400,
        "MISSING_ID"
      );
    }

    const deletedMetalStock = await MetalStockService.deleteMetalStock(
      id,
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Metal stock deleted successfully",
      data: deletedMetalStock
    });
  } catch (error) {
    next(error);
  }
};

// Hard delete metal stock (permanent deletion)
export const hardDeleteMetalStock = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createAppError(
        "Metal stock ID is required",
        400,
        "MISSING_ID"
      );
    }

    const result = await MetalStockService.hardDeleteMetalStock(id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// Get low stock items
export const getLowStockItems = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      branch,
      category
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      branch,
      category
    };

    const result = await MetalStockService.getLowStockItems(options);

    res.status(200).json({
      success: true,
      message: "Low stock items fetched successfully",
      data: result.lowStockItems,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// Update stock quantity
export const updateStockQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!id) {
      throw createAppError(
        "Metal stock ID is required",
        400,
        "MISSING_ID"
      );
    }

    if (quantity === undefined || quantity === null) {
      throw createAppError(
        "Quantity is required",
        400,
        "MISSING_QUANTITY"
      );
    }

    if (isNaN(quantity) || quantity < 0) {
      throw createAppError(
        "Quantity must be a valid non-negative number",
        400,
        "INVALID_QUANTITY"
      );
    }

    const updatedMetalStock = await MetalStockService.updateStockQuantity(
      id,
      parseFloat(quantity),
      req.admin.id
    );

    res.status(200).json({
      success: true,
      message: "Stock quantity updated successfully",
      data: updatedMetalStock
    });
  } catch (error) {
    next(error);
  }
};

// Get metal stock statistics
export const getMetalStockStats = async (req, res, next) => {
  try {
    const { branch, category } = req.query;
    const query = { isActive: true, status: "active" };

    if (branch) query.branch = branch;
    if (category) query.category = category;

    // You can implement statistics logic here
    // For now, returning basic stats
    const stats = {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0
    };

    res.status(200).json({
      success: true,
      message: "Metal stock statistics fetched successfully",
      data: stats
    });
  } catch (error) {
    next(error);
  }
};