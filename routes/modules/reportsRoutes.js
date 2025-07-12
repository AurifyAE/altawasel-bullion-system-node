import express from "express";
import {
    getrports
} from "../../controllers/modules/reportsController.js";

import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post("/metal-stock-ledger", getrports);


export default router;