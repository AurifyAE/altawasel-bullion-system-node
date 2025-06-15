
import VoucherMaster from "../../models/modules/VoucherMaster.js";
import VoucherSequence from "../../models/modules/VocherSequence.js";
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
    const { prefix, module } = voucherData;

    // Check if module exists
    if (await VoucherMaster.isModuleExists(module)) {
      throw createAppError("Module already exists", 400, "DUPLICATE_MODULE");
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
    const { prefix, module } = updateData;

    const voucher = await VoucherMaster.findById(id);
    if (!voucher) {
      throw createAppError("Voucher not found", 404, "VOUCHER_NOT_FOUND");
    }

    if (module && (await VoucherMaster.isModuleExists(module, id))) {
      throw createAppError("Module already exists", 400, "DUPLICATE_MODULE");
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
    if (voucherType) query.voucherType = voucherType.toUpperCase();
    if (module) query.module = module;

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

  // Get vouchers by type
  static async getVouchersByType(type) {
    const vouchers = await VoucherMaster.find({ voucherType: type.toUpperCase() });
    return vouchers;
  }

  // Get vouchers by module
//   static async getVouchersByModule(module) {
//     const vouchers = await VoucherMaster.find({ module });
//     return vouchers;
//   }
static async getVouchersByModule(module, page = 1, limit = 10) {
    if (!module) {
      throw createAppError("Module is required", 400, "MISSING_MODULE");
    }
  
    const query = { module: { $regex: `^${module}$`, $options: "i" } }; // Case-insensitive
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

  static async generateVoucherNumber(module) {
    // Validate module
    if (!module) {
      throw createAppError("Module is required", 400, "MISSING_MODULE");
    }

    // Find VoucherMaster document (case-insensitive)
    const voucher = await VoucherMaster.findOne({
      module: { $regex: `^${module}$`, $options: "i" },
    });
    if (!voucher) {
      throw createAppError("Voucher not found for module", 404, "VOUCHER_NOT_FOUND");
    }
    const updateOps = {
        $setOnInsert: {
          module: voucher.module,
          isActive: true,
        },
      };
      
      if (voucher.isAutoIncrement) {
        updateOps.$inc = { sequence: 1 };
      } else {
        updateOps.$setOnInsert.sequence = 1; // only if not auto-increment
      }

    // Atomically get or create sequence (case-insensitive)
    const sequenceDoc = await VoucherSequence.findOneAndUpdate(
      { module: { $regex: `^${module}$`, $options: "i" } },
      updateOps,
    //   {
    //     $setOnInsert: { module: voucher.module, sequence: 1, isActive: true },
    //     $inc: voucher.isAutoIncrement ? { sequence: 1 } : {}, // Increment only if auto-increment
    //   },
      {
        upsert: true,
        new: true, // Return updated document
        setDefaultsOnInsert: true,
      }
    );

    // console.log("Sequence for module:", module, "is:", sequenceDoc.sequence);

    // Generate voucher number using the sequence before increment (or current if not auto-increment)
    const sequence = voucher.isAutoIncrement
      ? sequenceDoc.sequence - 1 // Use pre-incremented value
      : sequenceDoc.sequence; // Use current value if not auto-increment
    const voucherNumber = `${voucher.prefix}${sequence.toString().padStart(3, "0")}`;

    // Format date based on voucher.dateFormat
    const today = new Date();
    let formattedDate;
    switch (voucher.dateFormat) {
      case "DD/MM/YYYY":
        formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
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
        formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today
          .getDate()
          .toString()
          .padStart(2, "0")}`;
        break;
      default:
        formattedDate = today.toISOString().split("T")[0]; // Fallback
    }

    return {
      module: voucher.module,
      prefix: voucher.prefix, // Rename from code to prefix for clarity
      voucherNumber,
      date: today.toISOString().split("T")[0],
      formattedDate,
    };
  }

  // Get all voucher types
//   static async getAllVoucherTypes() {
//     const voucherTypes = await VoucherMaster.find({ isActive: true }).select(
//       "code description voucherType prefix numberLength dateFormat isAutoIncrement module"
//     );
//     return voucherTypes;
//   }
}

export default VoucherMasterService;
