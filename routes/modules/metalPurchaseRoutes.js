import express from "express";
import {
  createMetalPurchase,
  getAllMetalPurchases,
  getMetalPurchaseById,
  updateMetalPurchase,
  deleteMetalPurchase,
  getMetalPurchasesByParty,
  getPurchaseStatistics,
  updatePurchaseStatus
} from "../../controllers/modules/MetalPurchaseController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { 
  validateObjectId,
  validatePagination,
  validateDateRange,
  validateMetalPurchaseCreate,
  validateMetalPurchaseUpdate,
  validateRequiredFields,
  validateEnum
} from "../../utils/validators/MetalPurchaseValidation.js";

const router = express.Router();

router.use(authenticateToken);


router.post("/", 
  validateMetalPurchaseCreate,
  createMetalPurchase
);

router.get("/", 
  validatePagination,
  validateDateRange,
  getAllMetalPurchases
);

// Get purchase statistics
router.get("/statistics", 
  validateDateRange,
  getPurchaseStatistics
);

// Get metal purchases by party
router.get("/party/:partyId", 
  validateObjectId("partyId"),
  validatePagination,
  getMetalPurchasesByParty
);

// Get metal purchase by ID
router.get("/:id", 
  validateObjectId("id"), 
  getMetalPurchaseById
);

// Update metal purchase
router.put("/:id", 
  validateObjectId("id"),
  validateMetalPurchaseUpdate,
  updateMetalPurchase
);

// Update purchase status only
router.patch("/:id/status", 
  validateObjectId("id"),
  validateRequiredFields(['status']),
  validateEnum('status', ['draft', 'confirmed', 'completed', 'cancelled']),
  updatePurchaseStatus
);

// Delete metal purchase (soft delete)
router.delete("/:id", 
  validateObjectId("id"), 
  deleteMetalPurchase
);

export default router;