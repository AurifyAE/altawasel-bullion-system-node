import express from "express";
import { getMetalStockLedgerReport, getStockMovementReport, stockAnalysis } from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/metal-stock-ledger", getMetalStockLedgerReport);
router.post("/stock-analysis", stockAnalysis);
router.post("/stcok-movement", getStockMovementReport);

export default router;
