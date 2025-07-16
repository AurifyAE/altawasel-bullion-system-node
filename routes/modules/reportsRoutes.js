import express from "express";
import { getMetalStockLedgerReport ,getStockMovementReport } from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/metal-stock-ledger", getMetalStockLedgerReport);
router.post("/stcok-movement", getStockMovementReport);

export default router;
