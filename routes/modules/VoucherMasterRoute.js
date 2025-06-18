
import express from "express";
import {
  createVoucher,
  updateVoucher,
    getAllVouchers,
  getVoucherById,
  deleteVoucher,
  hardDeleteVoucher,
  getVouchersByModule, // Updated function name
  generateVoucherNumber,
} from "../../controllers/modules/VoucherMasterController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Specific routes
router.post("/", createVoucher);
router.get("/module/:module", getVouchersByModule); // Changed from /type/:voucherType
router.post("/generate-number/:module", generateVoucherNumber);

// General routes
router.get("/", getAllVouchers);
router.get("/:id", getVoucherById);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);
router.delete("/:id/hard", hardDeleteVoucher);

export default router;