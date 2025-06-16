import express from "express";
import {
  createTradeCreditor,
  getAllTradeCreditors,
  getTradeCreditorById,
  updateTradeCreditor,
  deleteTradeCreditor,
  hardDeleteTradeCreditor,
  toggleTradeCreditorStatus,
  getActiveCreditorsList,
  searchCreditors,
  getCreditorStatistics,
  bulkUpdateStatus,
  bulkDeleteCreditors,
} from "../../controllers/modules/TradeCreditorController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { tradeCreditorUploadHandler } from "../../utils/fileUploadCreditor.js";


const router = express.Router();

router.use(authenticateToken);

// GET routes
router.get("/", getAllTradeCreditors);
router.get("/active", getActiveCreditorsList);
router.get("/search", searchCreditors);
router.get("/statistics", getCreditorStatistics);
router.get("/:id", getTradeCreditorById);
router.post(
  "/",
  tradeCreditorUploadHandler({
    useLocalStorage: false,
    maxFileSize: 50 * 1024 * 1024,
  }),
  createTradeCreditor
);
router.post("/bulk-update-status", bulkUpdateStatus);
router.post("/bulk-delete", bulkDeleteCreditors);
// PUT routes
router.put(
  "/:id",
  tradeCreditorUploadHandler({
    useLocalStorage: false,
    maxFileSize: 50 * 1024 * 1024,
  }),
  updateTradeCreditor
);
router.put("/:id/toggle-status", toggleTradeCreditorStatus);
// DELETE routes
router.delete("/:id", deleteTradeCreditor);
router.delete("/:id/hard-delete", hardDeleteTradeCreditor);

export default router;