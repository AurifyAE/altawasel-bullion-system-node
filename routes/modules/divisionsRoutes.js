import express from "express";
import {
  createDivision,
  getAllDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision,
  permanentDeleteDivision,
  restoreDivision,
} from "../../controllers/modules/DivisionMasterController.js";
import {
  validateCreateDivision,
  validateUpdateDivision,
  validatePagination,
  validateSearchParams,
} from "../../utils/validators/DivisionValidation.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET routes
router.get(
  "/",
  validatePagination,
  validateSearchParams,
  getAllDivisions
);
router.get("/:id", getDivisionById);

// POST routes
router.post("/", validateCreateDivision, createDivision);

// PUT routes
router.put("/:id", validateUpdateDivision, updateDivision);
router.put("/:id/restore", restoreDivision);

// DELETE routes
router.delete("/:id", deleteDivision);
router.delete("/:id/permanent", permanentDeleteDivision);

export default router;