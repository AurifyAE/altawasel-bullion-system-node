import express from "express";
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {  getAllInventory, createInventory, updateInventory } from '../../controllers/modules/inventoryController.js';

const router = express.Router();
router.use(authenticateToken);

router.post("/", createInventory);
router.get("/", getAllInventory);
router.put("/", updateInventory);

export default router;