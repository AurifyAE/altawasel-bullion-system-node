import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import entryMasterController from "../../controllers/modules/EntryMasterController.js";

const router = express.Router();

router.post('/', authenticateToken, entryMasterController.createEntry);
router.get('/', authenticateToken, entryMasterController.getAllEntries);
router.get('/:id', authenticateToken, entryMasterController.getEntryById);

export default router;