import express from "express";
import {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  hardDeleteVoucher,
  getVouchersByType,
  generateVoucherNumber,
  getNextVoucherNumber,
  resetVoucherCounter,
  getVoucherConfigByType,
  batchGenerateVoucherNumbers
} from "../../controllers/modules/VoucherMasterController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes for voucher management
router.post("/", createVoucher);
router.get("/", getAllVouchers);

// Routes for voucher types (for React frontend)
router.get("/type/:type", getVouchersByType);
router.get("/config/:type", getVoucherConfigByType); // New route for React components

// Routes for voucher operations
router.get("/:id", getVoucherById);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);
router.delete("/:id/hard", hardDeleteVoucher);

// Routes for voucher number generation
router.post("/:id/generate-number", generateVoucherNumber);
router.get("/:id/next-number", getNextVoucherNumber); // Preview next number
router.post("/:id/reset-counter", resetVoucherCounter); // Reset counter manually
router.post("/:id/batch-generate", batchGenerateVoucherNumbers); // Generate multiple numbers

export default router;