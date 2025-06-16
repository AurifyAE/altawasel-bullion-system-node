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
      const karat = await KaratMaster.findById(metalStockData.karat);
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

      // Create Registry entries if there's initial stock
      if ((metalStock.pcs && metalStock.pcsCount > 0 && metalStock.totalValue > 0) || 
          (!metalStock.pcs && metalStock.totalValue > 0)) {
        
        // Get cost center code if available
        let costCenterCode = null;
        if (metalStock.costCenter) {
          const CostCenter = mongoose.model("CostCenter");
          const costCenter = await CostCenter.findById(metalStock.costCenter);
          costCenterCode = costCenter ? costCenter.code : null;
        }

        await this.createRegistryEntries(
          metalStock, 
          "initial_stock", 
          "Initial stock entry", 
          costCenterCode,
          session
        );
      }

      await session.commitTransaction();

      // Populate referenced fields
      return await metalStock.populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "karatCode description standardPurity" },
        { path: "category", select: "code description" },
        { path: "subCategory", select: "code description" },
        { path: "type", select: "code description" },
        { path: "costCenter", select: "name code" },
        { path: "price", select: "basePrice currency" },
        { path: "createdBy", select: "name email" },
      ]);
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

  // Helper method to create Registry entries
  static async createRegistryEntries(metalStock, transactionType, description, costCenterCode = null, session = null) {
    try {
      // Populate metal type if not already populated
      if (!metalStock.metalType.code) {
        await metalStock.populate('metalType', 'code description');
      }
      
      const metalTypeCode = metalStock.metalType.code.toLowerCase();
      const stockValue = metalStock.totalValue;
      const registryEntries = [];

      if (stockValue > 0) {
        // Create metal-specific registry entry (e.g., "gold_stock", "silver_stock")
        const metalRegistryEntry = new Registry({
          costCenter: costCenterCode,
          type: `${metalTypeCode}_stock`,
          description: `${description} - ${metalStock.code} (${metalStock.description})`,
          value: stockValue,
          credit: stockValue, // Credit for stock addition
          debit: 0,
          reference: metalStock.code,
          createdBy: metalStock.createdBy,
        });

        if (session) {
          await metalRegistryEntry.save({ session });
        } else {
          await metalRegistryEntry.save();
        }
        registryEntries.push(metalRegistryEntry);

        // Create general stock registry entry
        const generalRegistryEntry = new Registry({
          costCenter: costCenterCode,
          type: "stock",
          description: `${description} - ${metalStock.code} (${metalStock.description})`,
          value: stockValue,
          credit: stockValue, // Credit for stock addition
          debit: 0,
          reference: metalStock.code,
          createdBy: metalStock.createdBy,
        });

        if (session) {
          await generalRegistryEntry.save({ session });
        } else {
          await generalRegistryEntry.save();
        }
        registryEntries.push(generalRegistryEntry);
      }

      return registryEntries;
    } catch (error) {
      console.error("Error creating registry entries:", error);
      throw error;
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
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find the metal stock
      const metalStock = await MetalStock.findById(stockId).populate('metalType', 'code description').session(session);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      // Store original values
      const originalPcsCount = metalStock.pcsCount;
      const originalTotalValue = metalStock.totalValue;

      // Update stock quantities
      if (metalStock.pcs) {
        // For piece-based stock
        if (stockData.pcsCount !== undefined) {
          metalStock.pcsCount += stockData.pcsCount;
        }
        if (stockData.totalValue !== undefined) {
          metalStock.totalValue += stockData.totalValue;
        }
      } else {
        // For weight-based stock
        if (stockData.quantity !== undefined) {
          metalStock.totalValue += stockData.quantity;
        }
      }

      metalStock.updatedBy = adminId;
      await metalStock.save({ session });

      // Create registry entries for the stock update
      const valueToRecord = metalStock.pcs ? stockData.totalValue : stockData.quantity;
      if (valueToRecord > 0) {
        await this.createRegistryEntries(
          metalStock, 
          transactionType, 
          description, 
          costCenterCode,
          session
        );
      }

      await session.commitTransaction();
      
      return {
        metalStock,
        adjustedPcs: metalStock.pcsCount - originalPcsCount,
        adjustedValue: metalStock.totalValue - originalTotalValue,
        originalPcs: originalPcsCount,
        originalValue: originalTotalValue,
        newPcs: metalStock.pcsCount,
        newValue: metalStock.totalValue,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
      const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;
      const skip = (page - 1) * limit;

      // Verify the metal stock exists
      const metalStock = await MetalStock.findById(stockId);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      // Get registry entries related to this stock
      const query = { reference: metalStock.code };
      
      const totalRecords = await Registry.countDocuments(query);
      const movements = await Registry.find(query)
        .populate([
          { path: "createdBy", select: "name email" },
          { path: "updatedBy", select: "name email" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      return {
        stockInfo: {
          id: metalStock._id,
          code: metalStock.code,
          description: metalStock.description,
          currentPcsCount: metalStock.pcsCount,
          currentTotalValue: metalStock.totalValue,
        },
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

  static async getStockMovementsSummary(stockId) {
    try {
      // Verify the metal stock exists
      const metalStock = await MetalStock.findById(stockId);
      if (!metalStock) {
        throw createAppError("Metal stock not found", 404, "METAL_STOCK_NOT_FOUND");
      }

      // Get summary of movements
      const movementsSummary = await Registry.aggregate([
        { $match: { reference: metalStock.code } },
        {
          $group: {
            _id: "$type",
            totalCredit: { $sum: "$credit" },
            totalDebit: { $sum: "$debit" },
            transactionCount: { $sum: 1 },
            lastTransaction: { $max: "$createdAt" },
          },
        },
        { $sort: { lastTransaction: -1 } },
      ]);

      const overallSummary = await Registry.aggregate([
        { $match: { reference: metalStock.code } },
        {
          $group: {
            _id: null,
            totalCredit: { $sum: "$credit" },
            totalDebit: { $sum: "$debit" },
            totalTransactions: { $sum: 1 },
            firstTransaction: { $min: "$createdAt" },
            lastTransaction: { $max: "$createdAt" },
          },
        },
      ]);

      return {
        stockInfo: {
          id: metalStock._id,
          code: metalStock.code,
          description: metalStock.description,
          currentPcsCount: metalStock.pcsCount,
          currentTotalValue: metalStock.totalValue,
        },
        movementsByType: movementsSummary,
        overallSummary: overallSummary[0] || {
          totalCredit: 0,
          totalDebit: 0,
          totalTransactions: 0,
          firstTransaction: null,
          lastTransaction: null,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getBulkStockData(stockIds) {
    try {
      const metalStocks = await MetalStock.find({
        _id: { $in: stockIds },
        isActive: true,
      }).populate([
        { path: "metalType", select: "code description" },
        { path: "branch", select: "name code" },
        { path: "karat", select: "karatCode description standardPurity" },
        { path: "category", select: "code description" },
        { path: "price", select: "basePrice currency" },
      ]);

      return metalStocks;
    } catch (error) {
      throw error;
    }
  }
}

export default MetalStockService;