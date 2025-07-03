import express from "express";
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getAllInventory, createInventory, updateInventory, getInventoryById } from '../../controllers/modules/inventoryController.js';

const router = express.Router();
router.use(authenticateToken);

router.post("/", createInventory);
router.get("/:id", getInventoryById);
router.get("/", getAllInventory);
router.put("/", updateInventory);

export default router;