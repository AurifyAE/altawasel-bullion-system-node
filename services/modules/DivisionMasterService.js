import DivisionMaster from "../../models/modules/DivisionMaster.js";
import { createAppError } from "../../utils/errorHandler.js";

export class DivisionMasterService {
  // Get all divisions with pagination and filtering
  static async getAllDivisions(page = 1, limit = 10, filters = {}) {
  try {
    const skip = (page - 1) * limit;

    // Build query object
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { code: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { costCenter: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Build sort object
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const [divisions, total] = await Promise.all([
      DivisionMaster.find(query)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort(sortObj) // Use dynamic sorting
        .skip(skip)
        .limit(parseInt(limit)),
      DivisionMaster.countDocuments(query),
    ]);

    return {
      divisions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  } catch (error) {
    throw createAppError(
      "Failed to fetch divisions",
      500,
      "FETCH_DIVISIONS_ERROR",
      error.message
    );
  }
}

  // Get division by ID
  static async getDivisionById(id) {
    try {
      const division = await DivisionMaster.findById(id)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!division) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      return division;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid division ID", 400, "INVALID_DIVISION_ID");
      }
      throw error;
    }
  }

  // Get division by code
  static async getDivisionByCode(code) {
    try {
      const division = await DivisionMaster.findOne({
        code: code.toUpperCase(),
      })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!division) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      return division;
    } catch (error) {
      throw error;
    }
  }

  // Create new division
  static async createDivision(divisionData, adminId) {
    try {
      // Check if code already exists
      const codeExists = await DivisionMaster.isCodeExists(divisionData.code);
      if (codeExists) {
        throw createAppError(
          "Division code already exists",
          409,
          "DUPLICATE_DIVISION_CODE"
        );
      }

      // Check if auto fix stock code already exists
      const stockCodeExists = await DivisionMaster.findOne({
        autoFixStockCode: divisionData.autoFixStockCode.toUpperCase(),
      });
      if (stockCodeExists) {
        throw createAppError(
          "Auto Fix Stock Code already exists",
          409,
          "DUPLICATE_STOCK_CODE"
        );
      }

      const division = new DivisionMaster({
        ...divisionData,
        createdBy: adminId,
      });

      await division.save();

      return await this.getDivisionById(division._id);
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw createAppError(`${field} already exists`, 409, "DUPLICATE_FIELD");
      }
      throw error;
    }
  }

  // Update division
  static async updateDivision(id, updateData, adminId) {
    try {
      const existingDivision = await DivisionMaster.findById(id);
      if (!existingDivision) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      // Check if code is being updated and if new code already exists
      if (updateData.code && updateData.code !== existingDivision.code) {
        const codeExists = await DivisionMaster.isCodeExists(
          updateData.code,
          id
        );
        if (codeExists) {
          throw createAppError(
            "Division code already exists",
            409,
            "DUPLICATE_DIVISION_CODE"
          );
        }
      }

      // Check if auto fix stock code is being updated and if new code already exists
      if (
        updateData.autoFixStockCode &&
        updateData.autoFixStockCode !== existingDivision.autoFixStockCode
      ) {
        const stockCodeExists = await DivisionMaster.findOne({
          autoFixStockCode: updateData.autoFixStockCode.toUpperCase(),
          _id: { $ne: id },
        });
        if (stockCodeExists) {
          throw createAppError(
            "Auto Fix Stock Code already exists",
            409,
            "DUPLICATE_STOCK_CODE"
          );
        }
      }

      const updatedDivision = await DivisionMaster.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedBy: adminId,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return updatedDivision;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid division ID", 400, "INVALID_DIVISION_ID");
      }
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw createAppError(`${field} already exists`, 409, "DUPLICATE_FIELD");
      }
      throw error;
    }
  }

  // Soft delete division (set status to inactive)
  static async deleteDivision(id, adminId) {
    try {
      const division = await DivisionMaster.findById(id);
      if (!division) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      const deletedDivision = await DivisionMaster.findByIdAndUpdate(
        id,
        {
          status: "inactive",
          isActive: false,
          updatedBy: adminId,
        },
        { new: true }
      )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return deletedDivision;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid division ID", 400, "INVALID_DIVISION_ID");
      }
      throw error;
    }
  }

  // Hard delete division (permanent delete)
  static async permanentDeleteDivision(id) {
    try {
      const division = await DivisionMaster.findById(id);
      if (!division) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      await DivisionMaster.findByIdAndDelete(id);
      return { message: "Division permanently deleted" };
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid division ID", 400, "INVALID_DIVISION_ID");
      }
      throw error;
    }
  }

  // Activate division
  static async activateDivision(id, adminId) {
    try {
      const division = await DivisionMaster.findById(id);
      if (!division) {
        throw createAppError("Division not found", 404, "DIVISION_NOT_FOUND");
      }

      const activatedDivision = await DivisionMaster.findByIdAndUpdate(
        id,
        {
          status: "active",
          isActive: true,
          updatedBy: adminId,
        },
        { new: true }
      )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      return activatedDivision;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid division ID", 400, "INVALID_DIVISION_ID");
      }
      throw error;
    }
  }

  // Get division statistics
  static async getDivisionStats() {
    try {
      const [totalDivisions, activeDivisions, inactiveDivisions] =
        await Promise.all([
          DivisionMaster.countDocuments(),
          DivisionMaster.countDocuments({ status: "active" }),
          DivisionMaster.countDocuments({ status: "inactive" }),
        ]);

      return {
        total: totalDivisions,
        active: activeDivisions,
        inactive: inactiveDivisions,
      };
    } catch (error) {
      throw createAppError(
        "Failed to fetch division statistics",
        500,
        "STATS_ERROR",
        error.message
      );
    }
  }
}
