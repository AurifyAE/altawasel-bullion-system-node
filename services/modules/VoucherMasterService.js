import VoucherMaster from "../../models/modules/VoucherMaster.js";
import { createAppError } from "../../utils/errorHandler.js";
import Vouchers from "../../models/modules/Voucher.js";

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

// In VoucherMasterService.js
static async getVouchersByModule(module, voucherType, page = 1, limit = 10) {
  if (!module) {
    throw createAppError("Module is required", 400, "MISSING_MODULE");
  }

  const query = { module: { $regex: `^${module}$`, $options: "i" } };
  if (voucherType) query.voucherType = { $regex: `^${voucherType}$`, $options: "i" };

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
  if (!module) {
    throw createAppError("Module is required", 400, "MISSING_MODULE");
  }

  // Split module into words (e.g., "metal-purchase" or "purchase-metal" -> ["metal", "purchase"])
  const moduleWords = module
    .split(/[-_]/) // Split by hyphen or underscore
    .filter(word => word.trim()); // Remove empty words

  // Create query conditions for each word
  const wordConditions = moduleWords.flatMap(word => [
    { voucherType: { $regex: `^${word}$`, $options: "i" } },
    { module: { $regex: `^${word}$`, $options: "i" } },
  ]);

  // Find VoucherMaster document where any word matches voucherType or module
  let voucher = await VoucherMaster.findOne({
    $or: wordConditions.length ? wordConditions : [
      { voucherType: { $regex: `^${module}$`, $options: "i" } },
      { module: { $regex: `^${module}$`, $options: "i" } },
    ],
  });

  if (!voucher) {
    throw createAppError(
      `No voucher found for ${module}`,
      404,
      "VOUCHER_NOT_FOUND"
    );
  }

  let sequence = voucher.sequence;
  let voucherNumber;
  let isUnique = false;

  // Loop until a unique voucher number is found in the Vouchers collection
  while (!isUnique) {
    // Generate voucher number
    voucherNumber = `${voucher.prefix}${sequence.toString().padStart(voucher.numberLength, "0")}`;

    // Check if the voucher number already exists in the Vouchers collection
    const existingVoucher = await Vouchers.findOne({
      voucherNumber: { $regex: `^${voucherNumber}$`, $options: "i" },
      $or: [
        { voucherType: { $regex: `^${voucher.voucherType}$`, $options: "i" } },
        { module: { $regex: `^${voucher.module}$`, $options: "i" } },
      ],
    });

    if (existingVoucher) {
      // If voucher number exists, increment sequence
      sequence++;
    } else {
      // Voucher number is unique, exit loop
      isUnique = true;
    }
  }

  // Atomically increment sequence in the VoucherMaster collection if auto-increment is enabled
  if (voucher.isAutoIncrement) {
    voucher = await VoucherMaster.findOneAndUpdate(
      {
        $or: [
          { voucherType: { $regex: `^${voucher.voucherType}$`, $options: "i" } },
          { module: { $regex: `^${voucher.module}$`, $options: "i" } },
        ],
      },
      { $set: { sequence: sequence + 1 } },
      { new: true }
    );

    if (!voucher) {
      throw createAppError(
        "Failed to update voucher sequence",
        500,
        "SEQUENCE_UPDATE_FAILED"
      );
    }
  }

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

  return {
    voucherType: voucher.voucherType,
    module: voucher.module,
    prefix: voucher.prefix,
    voucherNumber,
    date: today.toISOString().split("T")[0],
    formattedDate,
  };
}
}

export default VoucherMasterService;