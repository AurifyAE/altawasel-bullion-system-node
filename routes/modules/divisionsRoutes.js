import express from "express";
import {
  updateDivision,
  activateDivision,
  bulkActivateDivisions,
  bulkDeleteDivisions,
  createDivision,
  deleteDivision,
  getAllDivisions,
  getDivisionByCode,
  getDivisionById,
  getDivisionStats,
  permanentDeleteDivision,
} from "../../controllers/modules/DivisionMasterController.js";
import {
  validateCreateDivision,
  validateUpdateDivision,
  validateBulkOperation,
  validatePagination,
  validateSearchParams,
} from "../../utils/validators/DivisionValidation.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
const router = express.Router();
router.use(authenticateToken);
router.get(
  "/divisions",
  validatePagination,
  validateSearchParams,
  getAllDivisions
);
router.get("/stats", getDivisionStats);
router.get("/:id", getDivisionById);
router.get("/code/:code", getDivisionByCode);
// POST routes
router.post("/divisions-add", validateCreateDivision, createDivision);
router.post("/bulk-delete", validateBulkOperation, bulkDeleteDivisions);
router.post("/bulk-activate", validateBulkOperation, bulkActivateDivisions);
// PUT routes
router.put("/:id", validateUpdateDivision, updateDivision);
router.put("/:id/activate", activateDivision);
// DELETE routes
router.delete("/:id", deleteDivision);
router.delete("/:id/permanent", permanentDeleteDivision);

export default router;
