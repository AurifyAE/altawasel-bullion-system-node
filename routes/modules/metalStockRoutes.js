import express from "express";
import {
  createMetalStock,
  getAllMetalStocks,
  getMetalStockById,
  updateMetalStock,
  deleteMetalStock,
  hardDeleteMetalStock,
  getLowStockItems,
  updateStockQuantity,
  getMetalStockStats,
} from "../../controllers/modules/metalStockController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import {
  validateObjectId,
  validateRequiredFields,
  validatePagination,
  validateMetalStockFields,
  validateStringLength,
  validateEnumField,
} from "../../utils/validators/MetalStockValidation.js";

const router = express.Router();

router.use(authenticateToken);

router.post(
  "/",
  validateRequiredFields([
    "metalType",
    "code",
    "description",
    // "branch",
    "karat",
    "standardPurity",
    "unit",
    // "costCenter",
    "category",
    "subCategory",
    "type",
  ]),
  validateStringLength("code", 1, 20),
  validateStringLength("description", 1, 500),
  validateStringLength("unit", 1, 20),
  validateEnumField("status", ["active", "inactive", "discontinued"]),
  validateMetalStockFields,
  createMetalStock
);

router.get("/", validatePagination, getAllMetalStocks);

router.get("/stats", getMetalStockStats);

router.get("/low-stock", validatePagination, getLowStockItems);

router.get("/:id", validateObjectId("id"), getMetalStockById);

router.put(
  "/:id",
  validateObjectId("id"),
  validateMetalStockFields,
  validateEnumField("status", ["active", "inactive", "discontinued"]),
  updateMetalStock
);

router.patch("/:id/quantity", validateObjectId("id"), updateStockQuantity);

router.delete("/:id", validateObjectId("id"), deleteMetalStock);

router.delete("/:id/hard", validateObjectId("id"), hardDeleteMetalStock);

export default router;
