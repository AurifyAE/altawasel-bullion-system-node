import mongoose from "mongoose";
import MetalStock from "../../models/modules/MetalStock.js";
import Registry from "../../models/modules/Registry.js";
import { createAppError } from "../../utils/errorHandler.js";

class MetalStockService {
  static async createMetalStock(metalStockData, adminId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check for duplicate code
      if (await MetalStock.isCodeExists(metalStockData.code)) {
        throw createAppError("Metal stock code already exists", 409, "DUPLICATE_CODE");
      }

      // Fetch karat to get standardPurity
      const KaratMaster = mongoose.model("KaratMaster");
      const karat = await KaratMaster.findById(metalStockData.karat).session(session);
      if (!karat) {
        throw createAppError("Invalid karat ID", 400, "INVALID_KARAT");
      }

      // Create metal stock
      const metalStock = new MetalStock({
        ...metalStockData,
        standardPurity: karat.standardPurity,
        createdBy: adminId,
      });

      await metalStock.save({ session });

      // eclips      // Create registry entry for stock addition
      const { pcsCount, totalValue, quantity } = metalStockData;
      const registryResult = await MetalStock.updateStockWithRegistry(
        metalStock._id,
        { pcsCount, totalValue, quantity },
        "stock_in",
        `Initial stock addition for ${metalStock.code}`,
        adminId,
        metalStockData.costCenter || metalStock.code
      );

      await session.commitTransaction();

      // Populate referenced fields
      const populatedMetalStock = await MetalStock.findById(metalStock._id)
        .populate([
          { path: "metalType", select: "code description" },
          { path: "branch", select: "name code" },
          { path: "karat", select: "karatCode description standardPurity" },
          { path: "category", select: "code description" },
          { path: "subCategory", select: "code description" },
          { path: "type", select: "code description" },
          { path: "costCenter", select: "name code" },
          { path: "price", select: "basePrice currency" },
          { path: "createdBy", select: "name email" },
        ])
        .session(session);

      return populatedMetalStock;
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        throw createAppError("Metal stock code already exists", 409, "DUPLICATE_CODE");
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getAllMetalStocks(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        metalType,
        branch,
        category,
        status = "active",
        isActive = true,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;
      const query = { isActive };

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

      const totalRecords = await MetalStock.countDocuments(query);
      const metalStocks = await MetalStock.find(query)
        .populate([
          { path: "metalType", select: "code description" },
          { path: "branch", select: "name code" },
          { path: "karat", select: "karatCode description standardPurity" },
          { path: "category", select: "code description" },
          { path: "subCategory", select: "code description" },
          { path: "type", select: "code description" },
          { path: "price", select: "basePrice currency" },
          { path: "createdBy", select: "name email" },
          { path: "updatedBy", select: "name email" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      return {
        metalStocks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          hasNextPage: page < Math.ceil(totalRecords / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getMetalStockById(id) {
    try {
      const metalStock = await MetalStock.findById(id).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "karatCode description standardPurity" },
        { path: "category", select: "code description" },
        { path: "subCategory", select: "code description" },
        { path: "type", select: "code description" },
        { path: "costCenter", select: "name code" },
        { path: "size", select: "code description" },
        { path: "color", select: "code description" },
        { path: "brand", select: "code description" },
        { path: "country", select: "name code" },
        { path: "price", select: "basePrice currency" },
        { path: "charges", select: "name amount" },
        { path: "makingCharge", select: "name amount" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      return metalStock;
    } catch (error) {
      throw error;
    }
  }

  static async updateMetalStock(id, updateData, adminId) {
    try {
      const existingMetalStock = await MetalStock.findById(id);
      if (!existingMetalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      if (updateData.code && updateData.code !== existingMetalStock.code) {
        if (await MetalStock.isCodeExists(updateData.code, id)) {
          throw createAppError("Metal stock code already exists", 409, "DUPLICATE_CODE");
        }
      }

      if (updateData.karat) {
        const KaratMaster = mongoose.model("KaratMaster");
        const karat = await KaratMaster.findById(updateData.karat);
        if (!karat) {
          throw createAppError("Invalid karat ID", 400, "INVALID_KARAT");
        }
        updateData.standardPurity = karat.standardPurity;
      }

      const updatedMetalStock = await MetalStock.findByIdAndUpdate(
        id,
        { ...updateData, updatedBy: adminId },
        { new: true, runValidators: true }
      ).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "karatCode description standardPurity" },
        { path: "category", select: "code description" },
        { path: "subCategory", select: "code description" },
        { path: "type", select: "code description" },
        { path: "costCenter", select: "name code" },
        { path: "size", select: "code description" },
        { path: "color", select: "code description" },
        { path: "brand", select: "code description" },
        { path: "country", select: "name code" },
        { path: "price", select: "basePrice currency" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      return updatedMetalStock;
    } catch (error) {
      throw error;
    }
  }

  static async deleteMetalStock(id, adminId) {
    try {
      const metalStock = await MetalStock.findById(id);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      const deletedMetalStock = await MetalStock.findByIdAndUpdate(
        id,
        {
          isActive: false,
          status: "inactive",
          updatedBy: adminId,
        },
        { new: true }
      );

      return deletedMetalStock;
    } catch (error) {
      throw error;
    }
  }

  static async hardDeleteMetalStock(id) {
    try {
      const metalStock = await MetalStock.findById(id);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      const registryEntries = await Registry.countDocuments({ reference: metalStock.code });
      if (registryEntries > 0) {
        throw createAppError(
          "Cannot permanently delete metal stock with existing registry entries",
          409,
          "HAS_REGISTRY_ENTRIES"
        );
      }

      await MetalStock.findByIdAndDelete(id);
      return { message: "Metal stock permanently deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  static async updateStockQuantity(stockId, stockData, transactionType, description, adminId, costCenterCode = null) {
    try {
      return await MetalStock.updateStockWithRegistry(stockId, stockData, transactionType, description, adminId, costCenterCode);
    } catch (error) {
      throw error;
    }
  }

  static async getMetalStockStats(filters = {}) {
    try {
      const { branch, category } = filters;
      const baseQuery = { isActive: true, status: "active" };

      if (branch) baseQuery.branch = branch;
      if (category) baseQuery.category = category;

      const totalStocks = await MetalStock.countDocuments(baseQuery);

      // Aggregate stock statistics
      const stockStats = await MetalStock.aggregate([
        { $match: baseQuery },
        {
          $lookup: {
            from: "prices",
            localField: "price",
            foreignField: "_id",
            as: "priceInfo",
          },
        },
        { $unwind: { path: "$priceInfo", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalPcs: { $sum: "$pcsCount" },
            totalValue: { $sum: "$totalValue" },
            totalMonetaryValue: {
              $sum: {
                $multiply: [
                  "$totalValue",
                  { $ifNull: ["$priceInfo.basePrice", 0] },
                  { $divide: ["$standardPurity", 100] },
                ],
              },
            },
            pieceBasedCount: { $sum: { $cond: ["$pcs", 1, 0] } },
            weightBasedCount: { $sum: { $cond: ["$pcs", 0, 1] } },
          },
        },
      ]);

      const topCategories = await MetalStock.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: "$category",
            stockCount: { $sum: 1 },
            totalPcs: { $sum: "$pcsCount" },
            totalValue: { $sum: "$totalValue" },
          },
        },
        {
          $lookup: {
            from: "maincategories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $project: {
            categoryName: "$categoryInfo.name",
            categoryCode: "$categoryInfo.code",
            stockCount: 1,
            totalPcs: 1,
            totalValue: 1,
          },
        },
        { $sort: { stockCount: -1 } },
        { $limit: 5 },
      ]);

      const metalTypeDistribution = await MetalStock.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: "$metalType",
            stockCount: { $sum: 1 },
            totalPcs: { $sum: "$pcsCount" },
            totalValue: { $sum: "$totalValue" },
          },
        },
        {
          $lookup: {
            from: "divisionmasters",
            localField: "_id",
            foreignField: "_id",
            as: "metalTypeInfo",
          },
        },
        { $unwind: "$metalTypeInfo" },
        {
          $project: {
            metalTypeName: "$metalTypeInfo.description",
            metalTypeCode: "$metalTypeInfo.code",
            stockCount: 1,
            totalPcs: 1,
            totalValue: 1,
          },
        },
        { $sort: { stockCount: -1 } },
      ]);

      return {
        summary: {
          totalStocks,
          pieceBasedCount: stockStats[0]?.pieceBasedCount || 0,
          weightBasedCount: stockStats[0]?.weightBasedCount || 0,
        },
        stockStatistics: {
          totalPcs: stockStats[0]?.totalPcs || 0,
          totalValue: stockStats[0]?.totalValue || 0,
          totalMonetaryValue: stockStats[0]?.totalMonetaryValue || 0,
        },
        topCategories,
        metalTypeDistribution,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStockMovements(stockId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const metalStock = await MetalStock.findById(stockId);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      const query = { reference: metalStock.code };
      const totalRecords = await Registry.countDocuments(query);
      const movements = await Registry.find(query)
        .populate([{ path: "createdBy", select: "name email" }])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        movements,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          hasNextPage: page < Math.ceil(totalRecords / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getMetalStockByCode(code) {
    try {
      const metalStock = await MetalStock.findOne({
        code: code.toUpperCase(),
        isActive: true,
      }).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "karatCode description standardPurity" },
        { path: "category", select: "code description" },
        { path: "subCategory", select: "code description" },
        { path: "type", select: "code description" },
        { path: "price", select: "basePrice currency" },
      ]);

      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      return metalStock;
    } catch (error) {
      throw error;
    }
  }

  static async bulkUpdateStock(updates, adminId) {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { stockId, pcsCount, totalValue, quantity, transactionType, description, costCenterCode } = update;
          const result = await this.updateStockQuantity(
            stockId,
            { pcsCount, totalValue, quantity },
            transactionType,
            description,
            adminId,
            costCenterCode
          );
          results.push({ stockId, success: true, result });
        } catch (error) {
          errors.push({ stockId: update.stockId, success: false, error: error.message });
        }
      }

      return {
        successful: results,
        failed: errors,
        summary: {
          total: updates.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async exportStockData(filters = {}) {
    try {
      const { metalType, branch, category, status = "active" } = filters;
      const query = { isActive: true, status };

      if (metalType) query.metalType = metalType;
      if (branch) query.branch = branch;
      if (category) query.category = category;

      return await MetalStock.find(query)
        .populate([
          { path: "metalType", select: "code description" },
          { path: "branch", select: "name code" },
          { path: "karat", select: "karatCode description standardPurity" },
          { path: "category", select: "code description" },
          { path: "subCategory", select: "code description" },
          { path: "type", select: "code description" },
          { path: "price", select: "basePrice currency" },
        ])
        .sort({ code: 1 })
        .lean();
    } catch (error) {
      throw error;
    }
  }
}

export default MetalStockService;