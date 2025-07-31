import express from "express";
import { getReports, getStockBalance, getSalesAnalysis, getStockMovement, getStockAnalysis, getOwnStock, getTransactionSummary, metalFixing } from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/", getReports);
router.post("/stock-movement", getStockMovement);
router.post("/stock-balance", getStockBalance);
router.post("/stock-analysis", getStockAnalysis);
router.post("/transaction-summary", getTransactionSummary);
router.post("/sales-analysis", getSalesAnalysis);
router.post("/own-stock", getOwnStock);
router.post("/metal-fixing", metalFixing);

export default router;
