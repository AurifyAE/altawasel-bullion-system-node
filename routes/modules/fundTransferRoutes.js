import express from "express";
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { accountToAccountTransfer, openingBalanceTransfer } from '../../controllers/modules/FundTransferController.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', accountToAccountTransfer);
router.post('/opening-balance', openingBalanceTransfer);

export default router;