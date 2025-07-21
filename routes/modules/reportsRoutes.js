import express from "express";
import { getReports, getStockBalance, getStockMovement,getStockAnalysis } from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/", getReports);
router.post("/stock-movement", getStockMovement);
router.post("/stock-balance", getStockBalance);
router.post("/stock-analysis", getStockAnalysis);

export default router;
