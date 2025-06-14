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
} from "../../controllers/modules/VoucherMasterController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// 🔑 Specific first
router.post("/", createVoucher);
router.get("/module/:module", getVouchersByModule);
router.post("/generate-number/:module", generateVoucherNumber);
// router.get("/types", getAllVoucherTypes);

// ⚠️ More general later
router.get("/", getAllVouchers);
router.get("/:id", getVoucherById);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);
router.delete("/:id/hard", hardDeleteVoucher);

export default router;
