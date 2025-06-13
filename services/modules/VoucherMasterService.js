import VoucherMaster from "../../models/modules/VoucherMaster.js";
import { createAppError } from "../../utils/errorHandler.js";

class VoucherMasterService {
  // Create new voucher
  static async createVoucher(voucherData, adminId) {
    try {
      // Check if code already exists
      const codeExists = await VoucherMaster.isCodeExists(voucherData.code);
      if (codeExists) {
        throw createAppError(
          `Voucher with code '${voucherData.code}' already exists`,
          409,
          "DUPLICATE_CODE"
        );
      }

      const voucher = new VoucherMaster({
        ...voucherData,
        createdBy: adminId,
        lastResetDate: new Date() // Set initial reset date
      });

      await voucher.save();
      return await VoucherMaster.findById(voucher._id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
    } catch (error) {
      if (error.code === 11000) {
        throw createAppError(
          "Voucher code must be unique",
          409,
          "DUPLICATE_CODE"
        );
      }
      throw error;
    }
  }

  // Get all vouchers with pagination and filtering
  static async getAllVouchers(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.voucherType) {
        query.voucherType = filters.voucherType.toUpperCase();
      }
      if (filters.search) {
        query.$or = [
          { code: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { prefix: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [vouchers, total] = await Promise.all([
        VoucherMaster.find(query)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        VoucherMaster.countDocuments(query)
      ]);

      return {
        vouchers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get voucher by ID
  static async getVoucherById(id) {
    try {
      const voucher = await VoucherMaster.findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      return voucher;
    } catch (error) {
      throw error;
    }
  }

  // Update voucher
  static async updateVoucher(id, updateData, adminId) {
    try {
      const voucher = await VoucherMaster.findById(id);
      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      // Check if code is being updated and if it already exists
      if (updateData.code && updateData.code !== voucher.code) {
        const codeExists = await VoucherMaster.isCodeExists(updateData.code, id);
        if (codeExists) {
          throw createAppError(
            `Voucher with code '${updateData.code}' already exists`,
            409,
            "DUPLICATE_CODE"
          );
        }
      }

      const updatedVoucher = await VoucherMaster.findByIdAndUpdate(
        id,
        { ...updateData, updatedBy: adminId },
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      return updatedVoucher;
    } catch (error) {
      throw error;
    }
  }

  // Delete voucher (soft delete)
  static async deleteVoucher(id, adminId) {
    try {
      const voucher = await VoucherMaster.findById(id);
      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      const deletedVoucher = await VoucherMaster.findByIdAndUpdate(
        id,
        { 
          status: "inactive", 
          isActive: false, 
          updatedBy: adminId 
        },
        { new: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      return deletedVoucher;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete voucher
  static async hardDeleteVoucher(id) {
    try {
      const voucher = await VoucherMaster.findById(id);
      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      await VoucherMaster.findByIdAndDelete(id);
      return { message: "Voucher permanently deleted" };
    } catch (error) {
      throw error;
    }
  }

  // Get vouchers by type
  static async getVouchersByType(voucherType) {
    try {
      const vouchers = await VoucherMaster.find({
        voucherType: voucherType.toUpperCase(),
        status: "active",
        isActive: true
      })
        .populate('createdBy', 'name email')
        .sort({ code: 1 });

      return vouchers;
    } catch (error) {
      throw error;
    }
  }

  // Generate voucher number with proper sequencing
  static async generateVoucherNumber(voucherId, customDate = null) {
    try {
      const result = await VoucherMaster.generateVoucherNumber(voucherId, customDate);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get next voucher number without incrementing (for preview)
  static async getNextVoucherNumber(voucherId, customDate = null) {
    try {
      const result = await VoucherMaster.getNextVoucherNumber(voucherId, customDate);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Reset voucher counter manually
  static async resetVoucherCounter(voucherId, adminId) {
    try {
      const voucher = await VoucherMaster.findById(voucherId);
      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      const updatedVoucher = await VoucherMaster.findByIdAndUpdate(
        voucherId,
        { 
          nextNumber: 1, 
          lastResetDate: new Date(),
          updatedBy: adminId 
        },
        { new: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      return updatedVoucher;
    } catch (error) {
      throw error;
    }
  }

  // Get voucher configuration for a specific type (for React frontend)
  static async getVoucherConfigByType(voucherType) {
    try {
      const voucher = await VoucherMaster.findOne({
        voucherType: voucherType.toUpperCase(),
        status: "active",
        isActive: true
      });

      if (!voucher) {
        throw createAppError(
          `No active voucher configuration found for type: ${voucherType}`,
          404,
          "VOUCHER_CONFIG_NOT_FOUND"
        );
      }

      // Get next voucher number for preview
      const nextVoucherInfo = await this.getNextVoucherNumber(voucher._id);

      return {
        voucherConfig: voucher,
        nextVoucherNumber: nextVoucherInfo.voucherNumber,
        nextSequence: nextVoucherInfo.sequence,
        currentDate: nextVoucherInfo.formattedDate
      };
    } catch (error) {
      throw error;
    }
  }

  // Batch generate multiple voucher numbers
  static async batchGenerateVoucherNumbers(voucherId, count = 1, customDate = null) {
    try {
      const voucher = await VoucherMaster.findById(voucherId);
      if (!voucher) {
        throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
      }

      const voucherNumbers = [];
      for (let i = 0; i < count; i++) {
        const result = await VoucherMaster.generateVoucherNumber(voucherId, customDate);
        voucherNumbers.push(result);
      }

      return voucherNumbers;
    } catch (error) {
      throw error;
    }
  }
}

export default VoucherMasterService;