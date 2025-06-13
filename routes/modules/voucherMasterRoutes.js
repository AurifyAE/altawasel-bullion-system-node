import express from "express";
import {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  hardDeleteVoucher,
  getVouchersByType,
  generateVoucherNumber
} from "../../controllers/modules/VoucherMasterController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes
router.post("/", createVoucher);
router.get("/", getAllVouchers);
router.get("/type/:type", getVouchersByType);
router.get("/:id", getVoucherById);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);
router.delete("/:id/hard", hardDeleteVoucher);
router.post("/:id/generate-number", generateVoucherNumber);

export default router;