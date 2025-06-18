import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import entryMasterController from "../../controllers/modules/EntryMasterController.js";

const router = express.Router();

router.post('/', authenticateToken, entryMasterController.createEntry);
router.get('/:id', authenticateToken, entryMasterController.getEntryById);
router.get('/cash-receipts', authenticateToken, entryMasterController.getCashReceipts);
router.get('/cash-payments', authenticateToken, entryMasterController.getCashPayments);
router.get('/metal-receipts', authenticateToken, entryMasterController.getMetalReceipts);
router.get('/metal-payments', authenticateToken, entryMasterController.getMetalPayments);

export default router;