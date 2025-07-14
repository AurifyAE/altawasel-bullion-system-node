import express from "express";
import { getMetalStockLedgerReport } from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/metal-stock-ledger", getMetalStockLedgerReport);

export default router;
