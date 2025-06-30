import express from "express";
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { accountToAccountTransfer } from '../../controllers/modules/FundTransferController.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', accountToAccountTransfer);

export default router;