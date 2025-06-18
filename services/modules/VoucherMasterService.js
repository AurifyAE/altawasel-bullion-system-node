import VoucherMaster from "../../models/modules/VoucherMaster.js";
import MetalTransaction from "../../models/modules/MetalTransaction.js";
import Entry from "../../models/modules/EntryModel.js"; // Import Entry model
import { createAppError } from "../../utils/errorHandler.js";

class VoucherMasterService {
  // Generate code based on prefix
  static async generateCode(prefix) {
    const count = await VoucherMaster.countDocuments({ prefix });
    const sequence = (count + 1).toString().padStart(3, "0");
    return `${prefix}${sequence}`;
  }

  // Create voucher
  static async createVoucher(voucherData, createdBy) {
    const { prefix, voucherType, module } = voucherData;

    // Check if voucherType and module combination exists
    if (await VoucherMaster.isVoucherTypeAndModuleExists(voucherType, module)) {
      throw createAppError(
        "Voucher type and module combination already exists",
        400,
        "DUPLICATE_VOUCHER_TYPE_MODULE"
      );
    }

    // Generate code
    const code = await this.generateCode(prefix);

    const voucher = new VoucherMaster({
      ...voucherData,
      code,
      createdBy,
    });

    await voucher.save();
    return voucher;
  }

  // Update voucher
  static async updateVoucher(id, updateData, updatedBy) {
    const { prefix, voucherType, module } = updateData;

    const voucher = await VoucherMaster.findById(id);
    if (!voucher) {
      throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    }

    if (voucherType && module && (await VoucherMaster.isVoucherTypeAndModuleExists(voucherType, module, id))) {
      throw createAppError(
        "Voucher type and module combination already exists",
        400,
        "DUPLICATE_VOUCHER_TYPE_MODULE"
      );
    }

    if (prefix && prefix !== voucher.prefix) {
      updateData.code = await this.generateCode(prefix);
    }

    Object.assign(voucher, { ...updateData, updatedBy });
    await voucher.save();
    return voucher;
  }

  // Get all vouchers
  static async getAllVouchers(page = 1, limit = 10, filters = {}) {
    const { status, isActive, voucherType, module, search } = filters;
    const query = {};

    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive;
    if (voucherType) query.voucherType = { $regex: `^${voucherType}$`, $options: "i" };
    if (module) query.module = { $regex: `^${module}$`, $options: "i" };

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { voucherType: { $regex: search, $options: "i" } },
        { module: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const vouchers = await VoucherMaster.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await VoucherMaster.countDocuments(query);
    return { vouchers, total, page, limit };
  }

  // Get voucher by ID
  static async getVoucherById(id) {
    const voucher = await VoucherMaster.findById(id);
    if (!voucher) {
      throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    }
    return voucher;
  }

  // Soft delete voucher
  static async deleteVoucher(id, updatedBy) {
    const voucher = await VoucherMaster.findById(id);
    if (!voucher) {
      throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    }

    voucher.isActive = false;
    voucher.status = "inactive";
    voucher.updatedBy = updatedBy;
    await voucher.save();
    return voucher;
  }

  // Hard delete voucher
  static async hardDeleteVoucher(id) {
    const voucher = await VoucherMaster.findByIdAndDelete(id);
    if (!voucher) {
      throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    }
    return { message: "Voucher permanently deleted" };
  }

  // Get vouchers by module - Updated for new logic
  static async getVouchersByModule(module, voucherType, page = 1, limit = 10) {
    if (!module) {
      throw createAppError("Module is required", 400, "MISSING_MODULE");
    }

    const query = { 
      module: { $regex: `^${module}$`, $options: "i" },
      isActive: true,
      status: "active"
    };
    
    if (voucherType) {
      query.voucherType = { $regex: `^${voucherType}$`, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const vouchers = await VoucherMaster.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await VoucherMaster.countDocuments(query);

    if (!vouchers.length && page === 1) {
      throw createAppError("No vouchers found for module", 404, "VOUCHERS_NOT_FOUND");
    }

    return { vouchers, total, page, limit };
  }

  // Helper method to get transaction count based on module and type
  static async getTransactionCount(module, transactionType) {
    const moduleLC = module.toLowerCase();
    
    if (moduleLC.includes('metal')) {
      // For metal transactions
      if (transactionType) {
        return await MetalTransaction.countDocuments({
          transactionType: { $regex: `^${transactionType}$`, $options: "i" }
        });
      }
      return await MetalTransaction.countDocuments();
    } else if (moduleLC.includes('entry') || moduleLC.includes('receipt') || moduleLC.includes('payment')) {
      // For entry transactions
      const entryTypes = ["metal receipt", "metal payment", "cash receipt", "cash payment"];
      
      if (transactionType && entryTypes.includes(transactionType.toLowerCase())) {
        return await Entry.countDocuments({
          type: { $regex: `^${transactionType}$`, $options: "i" }
        });
      }
      
      // If no specific type, count all entries
      return await Entry.countDocuments();
    }
    
    return 0;
  }

  // Generate voucher number for any module/transaction type - Updated logic
  static async generateVoucherNumber(module, transactionType = null) {
    if (!module) {
      throw createAppError("Module is required", 400, "MISSING_MODULE");
    }

    // Find voucher configuration for the module
    const voucher = await VoucherMaster.findOne({
      module: { $regex: `^${module}$`, $options: "i" },
      isActive: true,
      status: "active"
    });

    if (!voucher) {
      throw createAppError(
        `No active voucher configuration found for module: ${module}`,
        404,
        "VOUCHER_CONFIG_NOT_FOUND"
      );
    }

    // Get transaction count based on module and type
    const transactionCount = await this.getTransactionCount(module, transactionType);

    // Generate next voucher number
    const nextSequence = transactionCount + 1;
    const voucherNumber = `${voucher.prefix}${nextSequence.toString().padStart(voucher.numberLength, "0")}`;

    // Format date based on voucher.dateFormat
    const today = new Date();
    let formattedDate;
    switch (voucher.dateFormat) {
      case "DD/MM/YYYY":
        formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(
          today.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}/${today.getFullYear()}`;
        break;
      case "MM/DD/YYYY":
        formattedDate = `${(today.getMonth() + 1).toString().padStart(2, "0")}/${today
          .getDate()
          .toString()
          .padStart(2, "0")}/${today.getFullYear()}`;
        break;
      case "YYYY-MM-DD":
        formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        break;
      default:
        formattedDate = today.toISOString().split("T")[0];
    }

    // Update sequence if auto-increment is enabled
    if (voucher.isAutoIncrement) {
      await VoucherMaster.findByIdAndUpdate(
        voucher._id,
        { $inc: { sequence: 1 } }
      );
    }

    return {
      voucherType: voucher.voucherType,
      module: voucher.module,
      prefix: voucher.prefix,
      voucherNumber,
      sequence: nextSequence,
      transactionCount: transactionCount,
      transactionType: transactionType,
      date: today.toISOString().split("T")[0],
      formattedDate,
      voucherConfig: {
        numberLength: voucher.numberLength,
        dateFormat: voucher.dateFormat,
        isAutoIncrement: voucher.isAutoIncrement
      }
    };
  }

  // Get voucher info for metal purchase page
  static async getMetalPurchaseVoucherInfo(module = "metal-purchase") {
    try {
      const voucher = await VoucherMaster.findOne({
        module: { $regex: `^${module}$`, $options: "i" },
        isActive: true,
        status: "active"
      });

      if (!voucher) {
        throw createAppError(
          `No voucher configuration found for ${module}`,
          404,
          "VOUCHER_CONFIG_NOT_FOUND"
        );
      }

      const purchaseCount = await MetalTransaction.countDocuments({
        transactionType: "purchase"
      });

      const nextSequence = purchaseCount + 1;
      const nextVoucherNumber = `${voucher.prefix}${nextSequence.toString().padStart(voucher.numberLength, "0")}`;

      return {
        prefix: voucher.prefix,
        currentCount: purchaseCount,
        nextSequence: nextSequence,
        nextVoucherNumber: nextVoucherNumber,
        numberLength: voucher.numberLength,
        voucherConfig: voucher
      };
    } catch (error) {
      throw error;
    }
  }

  // Get voucher info for metal sale page
  static async getMetalSaleVoucherInfo(module = "metal-sale") {
    try {
      const voucher = await VoucherMaster.findOne({
        module: { $regex: `^${module}$`, $options: "i" },
        isActive: true,
        status: "active"
      });

      if (!voucher) {
        throw createAppError(
          `No voucher configuration found for ${module}`,
          404,
          "VOUCHER_CONFIG_NOT_FOUND"
        );
      }

      const saleCount = await MetalTransaction.countDocuments({
        transactionType: "sale"
      });

      const nextSequence = saleCount + 1;
      const nextVoucherNumber = `${voucher.prefix}${nextSequence.toString().padStart(voucher.numberLength, "0")}`;

      return {
        prefix: voucher.prefix,
        currentCount: saleCount,
        nextSequence: nextSequence,
        nextVoucherNumber: nextVoucherNumber,
        numberLength: voucher.numberLength,
        voucherConfig: voucher
      };
    } catch (error) {
      throw error;
    }
  }

  // Get voucher info for Entry collections by type
  static async getEntryVoucherInfo(module, entryType) {
    try {
      const validEntryTypes = ["metal receipt", "metal payment", "cash receipt", "cash payment"];
      
      if (!validEntryTypes.includes(entryType.toLowerCase())) {
        throw createAppError(
          `Invalid entry type. Valid types: ${validEntryTypes.join(', ')}`,
          400,
          "INVALID_ENTRY_TYPE"
        );
      }

      const voucher = await VoucherMaster.findOne({
        module: { $regex: `^${module}$`, $options: "i" },
        isActive: true,
        status: "active"
      });

      if (!voucher) {
        throw createAppError(
          `No voucher configuration found for ${module}`,
          404,
          "VOUCHER_CONFIG_NOT_FOUND"
        );
      }

      // Count entries by specific type
      const entryCount = await Entry.countDocuments({
        type: { $regex: `^${entryType}$`, $options: "i" }
      });

      const nextSequence = entryCount + 1;
      const nextVoucherNumber = `${voucher.prefix}${nextSequence.toString().padStart(voucher.numberLength, "0")}`;

      return {
        prefix: voucher.prefix,
        currentCount: entryCount,
        nextSequence: nextSequence,
        nextVoucherNumber: nextVoucherNumber,
        numberLength: voucher.numberLength,
        entryType: entryType,
        voucherConfig: voucher
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all entry types voucher info
  static async getAllEntryTypesVoucherInfo(module = "entry") {
    try {
      const voucher = await VoucherMaster.findOne({
        module: { $regex: `^${module}$`, $options: "i" },
        isActive: true,
        status: "active"
      });

      if (!voucher) {
        throw createAppError(
          `No voucher configuration found for ${module}`,
          404,
          "VOUCHER_CONFIG_NOT_FOUND"
        );
      }

      const entryTypes = ["metal receipt", "metal payment", "cash receipt", "cash payment"];
      const entryTypesInfo = {};

      // Get count for each entry type
      for (const type of entryTypes) {
        const count = await Entry.countDocuments({
          type: { $regex: `^${type}$`, $options: "i" }
        });
        
        const nextSequence = count + 1;
        const nextVoucherNumber = `${voucher.prefix}${nextSequence.toString().padStart(voucher.numberLength, "0")}`;
        
        entryTypesInfo[type] = {
          currentCount: count,
          nextSequence: nextSequence,
          nextVoucherNumber: nextVoucherNumber
        };
      }

      return {
        prefix: voucher.prefix,
        numberLength: voucher.numberLength,
        voucherConfig: voucher,
        entryTypes: entryTypesInfo
      };
    } catch (error) {
      throw error;
    }
  }
}

export default VoucherMasterService;