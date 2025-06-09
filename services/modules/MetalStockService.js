import MetalStock from "../../models/modules/MetalStock.js";
import { createAppError } from "../../utils/errorHandler.js";

class MetalStockService {
  // Create new metal stock
  static async createMetalStock(metalStockData, adminId) {
    try {
      // Check if code already exists
      const codeExists = await MetalStock.isCodeExists(metalStockData.code);
      if (codeExists) {
        throw createAppError(
          "Metal stock code already exists",
          409,
          "DUPLICATE_CODE"
        );
      }

      // Create new metal stock
      const metalStock = new MetalStock({
        ...metalStockData,
        createdBy: adminId,
      });

      await metalStock.save();

      // Populate the referenced fields
      await metalStock.populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "name value" },
        { path: "category", select: "name code" },
        { path: "subCategory", select: "name code" },
        { path: "type", select: "name code" },
        { path: "costCenter", select: "name code" },
        { path: "createdBy", select: "name email" },
      ]);

      return metalStock;
    } catch (error) {
      if (error.code === 11000) {
        throw createAppError(
          "Metal stock code already exists",
          409,
          "DUPLICATE_CODE"
        );
      }
      throw error;
    }
  }

  // Get all metal stocks with pagination and filters
  static async getAllMetalStocks(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        metalType,
        branch,
        category,
        status = "active",
        isActive = true,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;
      const query = {};

      // Build query filters
      if (search) {
        query.$or = [
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (metalType) query.metalType = metalType;
      if (branch) query.branch = branch;
      if (category) query.category = category;
      if (status) query.status = status;
      if (typeof isActive === "boolean") query.isActive = isActive;

      // Get total count
      const totalRecords = await MetalStock.countDocuments(query);

      // Get metal stocks with pagination
      const metalStocks = await MetalStock.find(query)
        .populate([
          { path: "metalType", select: "code description" },
          { path: "branch", select: "name code" },
          {
            path: "karat",
            select:
              "karatCode description minimum maximum isScrap standardPurity",
          },
          { path: "category", select: "code description" },
          { path: "subCategory", select: "code description" },
          { path: "type", select: "code description" },
          // { path: 'costCenter', select: 'name code' },
          { path: "size", select: "code description" },
          { path: "color", select: "code description" },
          { path: "brand", select: "code description" },
          // { path: 'country',select: 'code description' },
          // { path: 'price', select: 'amount currency' },
          // { path: 'charges', select: 'name amount' },
          // { path: 'makingCharge', select: 'name amount' },
          { path: "createdBy", select: "name email" },
          { path: "updatedBy", select: "name email" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalPages = Math.ceil(totalRecords / limit);

      return {
        metalStocks,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get metal stock by ID
  static async getMetalStockById(id) {
    try {
      const metalStock = await MetalStock.findById(id).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "name value" },
        { path: "category", select: "name code" },
        { path: "subCategory", select: "name code" },
        { path: "type", select: "name code" },
        { path: "costCenter", select: "name code" },
        { path: "size", select: "name value" },
        { path: "color", select: "name code" },
        { path: "brand", select: "name code" },
        { path: "country", select: "name code" },
        { path: "price", select: "amount currency" },
        { path: "charges", select: "name amount" },
        { path: "makingCharge", select: "name amount" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      if (!metalStock) {
        throw createAppError(
          "Metal stock not found",
          404,
          "METAL_STOCK_NOT_FOUND"
        );
      }

      return metalStock;
    } catch (error) {
      throw error;
    }
  }

  // Update metal stock
  static async updateMetalStock(id, updateData, adminId) {
    try {
      // Check if metal stock exists
      const existingMetalStock = await MetalStock.findById(id);
      if (!existingMetalStock) {
        throw createAppError(
          "Metal stock not found",
          404,
          "METAL_STOCK_NOT_FOUND"
        );
      }

      // Check if code is being updated and if it already exists
      if (updateData.code && updateData.code !== existingMetalStock.code) {
        const codeExists = await MetalStock.isCodeExists(updateData.code, id);
        if (codeExists) {
          throw createAppError(
            "Metal stock code already exists",
            409,
            "DUPLICATE_CODE"
          );
        }
      }

      // Update metal stock
      const updatedMetalStock = await MetalStock.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedBy: adminId,
        },
        { new: true, runValidators: true }
      ).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        {
          path: "karat",
          select:
            "karatCode description minimum maximum isScrap standardPurity",
        },
        { path: "category", select: "code description" },
        { path: "subCategory", select: "code description" },
        { path: "type", select: "code description" },
        // { path: 'costCenter', select: 'name code' },
        { path: "size", select: "code description" },
        { path: "color", select: "code description" },
        { path: "brand", select: "code description" },
        // { path: 'country',select: 'code description' },
        // { path: 'price', select: 'amount currency' },
        // { path: 'charges', select: 'name amount' },
        // { path: 'makingCharge', select: 'name amount' },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      return updatedMetalStock;
    } catch (error) {
      if (error.code === 11000) {
        throw createAppError(
          "Metal stock code already exists",
          409,
          "DUPLICATE_CODE"
        );
      }
      throw error;
    }
  }

  // Delete metal stock (soft delete)
  static async deleteMetalStock(id, adminId) {
    try {
      const metalStock = await MetalStock.findById(id);
      if (!metalStock) {
        throw createAppError(
          "Metal stock not found",
          404,
          "METAL_STOCK_NOT_FOUND"
        );
      }

      // Soft delete - update status and isActive
      const deletedMetalStock = await MetalStock.findByIdAndUpdate(
        id,
        {
          status: "inactive",
          isActive: false,
          updatedBy: adminId,
        },
        { new: true }
      );

      return deletedMetalStock;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete metal stock (permanent deletion)
  static async hardDeleteMetalStock(id) {
    try {
      const metalStock = await MetalStock.findById(id);
      if (!metalStock) {
        throw createAppError(
          "Metal stock not found",
          404,
          "METAL_STOCK_NOT_FOUND"
        );
      }

      await MetalStock.findByIdAndDelete(id);
      return { message: "Metal stock permanently deleted" };
    } catch (error) {
      throw error;
    }
  }

  // Get low stock items
  static async getLowStockItems(options = {}) {
    try {
      const { page = 1, limit = 10, branch, category } = options;

      const skip = (page - 1) * limit;
      const query = {
        $expr: {
          $lte: ["$stockQuantity", "$reorderLevel"],
        },
        isActive: true,
        status: "active",
      };

      if (branch) query.branch = branch;
      if (category) query.category = category;

      const totalRecords = await MetalStock.countDocuments(query);

      const lowStockItems = await MetalStock.find(query)
        .populate([
          { path: "metalType", select: "code description" },
          { path: "branch", select: "name code" },
          { path: "category", select: "name code" },
        ])
        .sort({ stockQuantity: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalPages = Math.ceil(totalRecords / limit);

      return {
        lowStockItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Update stock quantity
  static async updateStockQuantity(id, quantity, adminId) {
    try {
      const metalStock = await MetalStock.findById(id);
      if (!metalStock) {
        throw createAppError(
          "Metal stock not found",
          404,
          "METAL_STOCK_NOT_FOUND"
        );
      }

      if (quantity < 0) {
        throw createAppError(
          "Stock quantity cannot be negative",
          400,
          "INVALID_QUANTITY"
        );
      }

      const updatedMetalStock = await MetalStock.findByIdAndUpdate(
        id,
        {
          stockQuantity: quantity,
          updatedBy: adminId,
        },
        { new: true }
      ).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
      ]);

      return updatedMetalStock;
    } catch (error) {
      throw error;
    }
  }
}

export default MetalStockService;
