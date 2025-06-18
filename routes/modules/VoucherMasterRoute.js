import express from "express";
import {
  createVoucher,
  updateVoucher,
  getAllVouchers,
  getVoucherById,
  deleteVoucher,
  hardDeleteVoucher,
  getVouchersByModule,
  generateVoucherNumber,
  getMetalPurchaseVoucherInfo,
  getMetalSaleVoucherInfo,
  getVoucherInfoByModule,
  getEntryVoucherInfo,
  getAllEntryTypesVoucherInfo,
} from "../../controllers/modules/VoucherMasterController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Specific routes for metal transactions
// Fixed: Removed optional parameter syntax and handle defaults in controller
router.get("/metal-purchase-info/:module", getMetalPurchaseVoucherInfo);
router.get("/metal-purchase-info", getMetalPurchaseVoucherInfo); // Default route without module

router.get("/metal-sale-info/:module", getMetalSaleVoucherInfo);
router.get("/metal-sale-info", getMetalSaleVoucherInfo); // Default route without module

// Specific routes for entry transactions
router.get("/entry-info/:module/:entryType", getEntryVoucherInfo); // Changed to use path parameter instead of query
router.get("/entry-info/:module", getEntryVoucherInfo); // Fallback for module only

router.get("/entry-all-types-info/:module", getAllEntryTypesVoucherInfo);
router.get("/entry-all-types-info", getAllEntryTypesVoucherInfo); // Default route without module

// Generic voucher info endpoint
router.get("/info/:module", getVoucherInfoByModule);

// Voucher generation routes
router.post("/generate-number/:module/:transactionType", generateVoucherNumber); // Added transaction type as path param
router.post("/generate-number/:module", generateVoucherNumber); // Fallback without transaction type

// Module-specific voucher retrieval
router.get("/module/:module/:voucherType", getVouchersByModule); // Added voucher type as path param
router.get("/module/:module", getVouchersByModule); // Fallback without voucher type

// CRUD routes (keep these at the end to avoid conflicts)
router.post("/", createVoucher);
router.get("/", getAllVouchers);
router.get("/:id", getVoucherById);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);
router.delete("/hard/:id", hardDeleteVoucher);

export default router;