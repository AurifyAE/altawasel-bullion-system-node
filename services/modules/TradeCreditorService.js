import TradeCreditors from "../../models/modules/TradeCreditors.js";
import { createAppError } from "../../utils/errorHandler.js";
import { deleteMultipleS3Files } from "../../utils/s3Utils.js";

class TradeCreditorService {
  // Create new trade creditor
  static async createTradeCreditor(creditorData, adminId) {
    try {
      // Check if account code already exists
      const isCodeExists = await TradeCreditors.isAccountCodeExists(
        creditorData.accountCode
      );
      if (isCodeExists) {
        throw createAppError(
          "Account code already exists",
          400,
          "DUPLICATE_ACCOUNT_CODE"
        );
      }

      // Validate required nested data
      if (!creditorData.addresses || creditorData.addresses.length === 0) {
        throw createAppError(
          "At least one address is required",
          400,
          "MISSING_ADDRESS"
        );
      }

      if (!creditorData.employees || creditorData.employees.length === 0) {
        throw createAppError(
          "At least one employee contact is required",
          400,
          "MISSING_EMPLOYEE"
        );
      }

      // Set created by
      creditorData.createdBy = adminId;

      // Create trade creditor
      const tradeCreditor = new TradeCreditors(creditorData);
      await tradeCreditor.save();

      // Populate references
      await tradeCreditor.populate([
        {
          path: "acDefinition.currencies.currency",
          select: "currencyCode description",
        },
        {
          path: "acDefinition.branches.branch",
          select: "code name",
        },
        {
          path: "createdBy",
          select: "name email",
        },
      ]);
      
      return tradeCreditor;
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        throw createAppError(
          `Validation failed: ${messages.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }
      throw error;
    }
  }

  // Get all trade creditors with pagination and filters
  static async getAllTradeCreditors(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        classification = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;
      const query = {};

      // Search functionality
      if (search) {
        query.$or = [
          { customerName: { $regex: search, $options: "i" } },
          { accountCode: { $regex: search, $options: "i" } },
          { shortName: { $regex: search, $options: "i" } },
        ];
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Classification filter
      if (classification) {
        query.classification = classification;
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const [tradeCreditors, total] = await Promise.all([
        TradeCreditors.find(query)
          .populate([
            {
              path: "acDefinition.currencies.currency",
              select: "currencyCode description",
            },
            { path: "acDefinition.branches.branch", select: "code name" },
            { path: "createdBy", select: "name email" },
            { path: "updatedBy", select: "name email" },
          ])
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
          TradeCreditors.countDocuments(query),
      ]);

      return {
        tradeCreditors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      };
    } catch (error) {
      throw createAppError("Error fetching trade creditors", 500, "FETCH_ERROR");
    }
  }

  // Get trade creditor by ID
  static async getTradeCreditorById(id) {
    try {
      const tradeCreditor = await TradeCreditors.findById(id).populate([
        {
          path: "acDefinition.currencies.currency",
          select: "code name symbol",
        },
        { path: "acDefinition.branches.branch", select: "code name" },
        { path: "limitsMargins.currency", select: "code name symbol" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      if (!tradeCreditor) {
        throw createAppError("Trade creditor not found", 404, "CREDITOR_NOT_FOUND");
      }

      return tradeCreditor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade creditor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  static extractS3Keys(tradeCreditor) {
    const s3Keys = [];

    try {
      // Extract from VAT/GST documents
      if (tradeCreditor.vatGstDetails?.documents?.length) {
        tradeCreditor.vatGstDetails.documents.forEach((doc) => {
          if (doc.s3Key && typeof doc.s3Key === "string" && doc.s3Key.trim()) {
            s3Keys.push(doc.s3Key.trim());
          }
        });
      }

      // Extract from KYC documents
      if (tradeCreditor.kycDetails?.length) {
        tradeCreditor.kycDetails.forEach((kyc) => {
          if (kyc.documents?.length) {
            kyc.documents.forEach((doc) => {
              if (
                doc.s3Key &&
                typeof doc.s3Key === "string" &&
                doc.s3Key.trim()
              ) {
                s3Keys.push(doc.s3Key.trim());
              }
            });
          }
        });
      }

      // Remove duplicates
      return [...new Set(s3Keys)];
    } catch (error) {
      console.error("Error extracting S3 keys:", error);
      return s3Keys;
    }
  }

  // Helper function to extract S3 keys from update data
  static extractS3KeysFromUpdateData(updateData) {
    const s3Keys = [];

    try {
      // Extract from VAT/GST documents in update data
      if (updateData.vatGstDetails?.documents?.length) {
        updateData.vatGstDetails.documents.forEach((doc) => {
          if (doc.s3Key && typeof doc.s3Key === "string" && doc.s3Key.trim()) {
            s3Keys.push(doc.s3Key.trim());
          }
        });
      }

      // Extract from KYC documents in update data
      if (updateData.kycDetails?.length) {
        updateData.kycDetails.forEach((kyc) => {
          if (kyc.documents?.length) {
            kyc.documents.forEach((doc) => {
              if (
                doc.s3Key &&
                typeof doc.s3Key === "string" &&
                doc.s3Key.trim()
              ) {
                s3Keys.push(doc.s3Key.trim());
              }
            });
          }
        });
      }

      // Remove duplicates
      return [...new Set(s3Keys)];
    } catch (error) {
      console.error("Error extracting S3 keys from update data:", error);
      return s3Keys;
    }
  }

  // Helper function to get files to delete based on replacement/removal logic
  static getFilesToDelete(existingTradeCreditor, updateData) {
    const filesToDelete = [];

    try {
      // Handle VAT documents
      if (updateData.vatGstDetails?.documents) {
        const oldVatDocs = existingTradeCreditor.vatGstDetails?.documents || [];

        // If we're completely replacing VAT documents
        if (updateData._replaceVatDocuments) {
          oldVatDocs.forEach((doc) => {
            if (
              doc.s3Key &&
              typeof doc.s3Key === "string" &&
              doc.s3Key.trim()
            ) {
              filesToDelete.push(doc.s3Key.trim());
            }
          });
        }
        // If we're selectively removing documents
        else if (updateData._removeVatDocuments?.length) {
          updateData._removeVatDocuments.forEach((docId) => {
            const docToRemove = oldVatDocs.find(
              (doc) => doc._id?.toString() === docId
            );
            if (
              docToRemove?.s3Key &&
              typeof docToRemove.s3Key === "string" &&
              docToRemove.s3Key.trim()
            ) {
              filesToDelete.push(docToRemove.s3Key.trim());
            }
          });
        }
      }

      // Handle KYC documents
      if (updateData.kycDetails?.length) {
        updateData.kycDetails.forEach((kycUpdate, index) => {
          if (kycUpdate.documents) {
            const oldKycDocs =
              existingTradeCreditor.kycDetails?.[index]?.documents || [];

            // If we're completely replacing KYC documents for this entry
            if (kycUpdate._replaceDocuments) {
              oldKycDocs.forEach((doc) => {
                if (
                  doc.s3Key &&
                  typeof doc.s3Key === "string" &&
                  doc.s3Key.trim()
                ) {
                  filesToDelete.push(doc.s3Key.trim());
                }
              });
            }
            // If we're selectively removing documents
            else if (kycUpdate._removeDocuments?.length) {
              kycUpdate._removeDocuments.forEach((docId) => {
                const docToRemove = oldKycDocs.find(
                  (doc) => doc._id?.toString() === docId
                );
                if (
                  docToRemove?.s3Key &&
                  typeof docToRemove.s3Key === "string" &&
                  docToRemove.s3Key.trim()
                ) {
                  filesToDelete.push(docToRemove.s3Key.trim());
                }
              });
            }
          }
        });
      }

      // Remove duplicates
      return [...new Set(filesToDelete)];
    } catch (error) {
      console.error("Error determining files to delete:", error);
      return filesToDelete;
    }
  }

  static async updateTradeCreditor(id, updateData, adminId) {
    try {
      const tradeCreditor = await TradeCreditors.findById(id);
      if (!tradeCreditor) {
        throw createAppError("Trade creditor not found", 404, "CREDITOR_NOT_FOUND");
      }

      // Check if account code is being updated and if it already exists
      if (
        updateData.accountCode &&
        updateData.accountCode !== tradeCreditor.accountCode
      ) {
        const isCodeExists = await TradeCreditors.isAccountCodeExists(
          updateData.accountCode,
          id
        );
        if (isCodeExists) {
          throw createAppError(
            "Account code already exists",
            400,
            "DUPLICATE_ACCOUNT_CODE"
          );
        }
      }

      // Determine which files need to be deleted
      const filesToDelete = this.getFilesToDelete(tradeCreditor, updateData);

      // Process document updates with proper merging
      if (updateData.vatGstDetails?.documents) {
        const oldVatDocs = tradeCreditor.vatGstDetails?.documents || [];

        if (updateData._replaceVatDocuments) {
          // Complete replacement - just use new documents
          // filesToDelete already contains old files
        } else if (updateData._removeVatDocuments?.length) {
          // Selective removal - merge remaining old docs with new docs
          const remainingOldDocs = oldVatDocs.filter(
            (doc) =>
              !updateData._removeVatDocuments.includes(doc._id?.toString())
          );
          updateData.vatGstDetails.documents = [
            ...remainingOldDocs,
            ...updateData.vatGstDetails.documents,
          ];
        } else {
          // Append mode - add new documents to existing ones
          updateData.vatGstDetails.documents = [
            ...oldVatDocs,
            ...updateData.vatGstDetails.documents,
          ];
        }
      }

      // Process KYC document updates
      if (updateData.kycDetails?.length) {
        updateData.kycDetails.forEach((kycUpdate, index) => {
          if (kycUpdate.documents) {
            const oldKycDocs = tradeCreditor.kycDetails?.[index]?.documents || [];

            if (kycUpdate._replaceDocuments) {
              // Complete replacement - just use new documents
              // filesToDelete already contains old files
            } else if (kycUpdate._removeDocuments?.length) {
              // Selective removal - merge remaining old docs with new docs
              const remainingOldDocs = oldKycDocs.filter(
                (doc) =>
                  !kycUpdate._removeDocuments.includes(doc._id?.toString())
              );
              kycUpdate.documents = [
                ...remainingOldDocs,
                ...kycUpdate.documents,
              ];
            } else {
              // Append mode - add new documents to existing ones
              kycUpdate.documents = [...oldKycDocs, ...kycUpdate.documents];
            }
          }
        });
      }

      // Clean up temporary flags used for file management
      delete updateData._replaceVatDocuments;
      delete updateData._removeVatDocuments;
      if (updateData.kycDetails) {
        updateData.kycDetails.forEach((kyc) => {
          delete kyc._replaceDocuments;
          delete kyc._removeDocuments;
        });
      }

      // Set updated by and timestamp
      updateData.updatedBy = adminId;
      updateData.updatedAt = new Date();

      // Update the database first
      const updatedTradeCreditor = await TradeCreditors.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        {
          path: "acDefinition.currencies.currency",
          select: "code name symbol",
        },
        { path: "acDefinition.branches.branch", select: "code name" },
        { path: "limitsMargins.currency", select: "code name symbol" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      // Delete old S3 files if any need to be removed (after successful DB update)
      let s3DeletionResult = { successful: [], failed: [] };
      if (filesToDelete.length > 0) {
        console.log(
          `Deleting ${filesToDelete.length} replaced/removed S3 files:`,
          filesToDelete
        );

        try {
          s3DeletionResult = await deleteMultipleS3Files(filesToDelete);

          if (s3DeletionResult.failed?.length > 0) {
            console.warn(
              "Some S3 files could not be deleted:",
              s3DeletionResult.failed
            );
          }

          if (s3DeletionResult.successful?.length > 0) {
            console.log(
              `Successfully deleted ${s3DeletionResult.successful.length} S3 files`
            );
          }
        } catch (s3Error) {
          console.error("Error deleting S3 files:", s3Error);
          // Don't fail the update operation if S3 deletion fails
          s3DeletionResult = {
            successful: [],
            failed: filesToDelete.map((key) => ({
              key,
              error: s3Error.message,
            })),
          };
        }
      }

      return {
        ...updatedTradeCreditor.toObject(),
        _filesManagement: {
          filesDeleted: s3DeletionResult.successful?.length || 0,
          filesFailedToDelete: s3DeletionResult.failed?.length || 0,
          deletedKeys:
            s3DeletionResult.successful?.map((result) => result.key) || [],
          failedKeys:
            s3DeletionResult.failed?.map((result) => result.key) || [],
        },
      };
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        throw createAppError(
          `Validation failed: ${messages.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }
      if (error.name === "CastError") {
        throw createAppError("Invalid trade creditor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Delete trade creditor (soft delete)
  static async deleteTradeCreditor(id, adminId) {
    try {
      const tradeCreditor = await TradeCreditors.findById(id);
      if (!tradeCreditor) {
        throw createAppError("Trade creditor not found", 404, "CREDITOR_NOT_FOUND");
      }

      // Soft delete - mark as inactive
      const deletedTradeCreditor = await TradeCreditors.findByIdAndUpdate(
        id,
        {
          isActive: false,
          status: "inactive",
          updatedBy: adminId,
        },
        { new: true }
      );

      return deletedTradeCreditor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade creditor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Hard delete trade creditor
  static async hardDeleteTradeCreditor(id) {
    try {
      const tradeCreditor = await TradeCreditors.findById(id);
      if (!tradeCreditor) {
        throw createAppError("Trade creditor not found", 404, "CREDITOR_NOT_FOUND");
      }

      // Extract all S3 keys from the document
      const s3Keys = this.extractS3Keys(tradeCreditor);

      console.log(
        `Preparing to delete trade creditor ${id} with ${s3Keys.length} associated files`
      );

      // Delete the trade creditor from database first
      await TradeCreditors.findByIdAndDelete(id);

      // Delete associated S3 files if any exist
      let s3DeletionResult = { successful: [], failed: [] };
      if (s3Keys.length > 0) {
        console.log(
          `Deleting ${s3Keys.length} S3 files for trade creditor ${id}:`,
          s3Keys
        );

        try {
          s3DeletionResult = await deleteMultipleS3Files(s3Keys);

          if (s3DeletionResult.failed?.length > 0) {
            console.warn(
              "Some S3 files could not be deleted:",
              s3DeletionResult.failed
            );
          }
        } catch (s3Error) {
          console.error("Error deleting S3 files:", s3Error);
          s3DeletionResult = {
            successful: [],
            failed: s3Keys.map((key) => ({ key, error: s3Error.message })),
          };
        }
      }

      const result = {
        message: "Trade creditor permanently deleted",
        filesDeleted: {
          total: s3Keys.length,
          successful: s3DeletionResult.successful?.length || 0,
          failed: s3DeletionResult.failed?.length || 0,
          successfulKeys:
            s3DeletionResult.successful?.map((result) => result.key) || [],
          failedKeys:
            s3DeletionResult.failed?.map((result) => result.key) || [],
        },
      };

      if (s3DeletionResult.failed?.length > 0) {
        result.message += " (warning: some files may remain in S3)";
        result.filesDeleted.errors = s3DeletionResult.failed;
      }

      return result;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade creditor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Toggle status
  static async toggleStatus(id, adminId) {
    try {
      const tradeCreditor = await TradeCreditors.findById(id);
      if (!tradeCreditor) {
        throw createAppError("Trade creditor not found", 404, "CREDITOR_NOT_FOUND");
      }

      const newStatus = tradeCreditor.status === "active" ? "inactive" : "active";
      const updatedTradeCreditor = await TradeCreditors.findByIdAndUpdate(
        id,
        {
          status: newStatus,
          isActive: newStatus === "active",
          updatedBy: adminId,
        },
        { new: true }
      );

      return updatedTradeCreditor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade creditor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Get active creditors for dropdown
  static async getActiveCreditorsList() {
    try {
      const creditors = await TradeCreditors.find(
        { isActive: true, status: "active" },
        { accountCode: 1, customerName: 1, shortName: 1 }
      ).sort({ customerName: 1 });

      return creditors;
    } catch (error) {
      throw createAppError(
        "Error fetching active creditors list",
        500,
        "FETCH_ERROR"
      );
    }
  }

  // Search creditors by name or code
  static async searchCreditors(searchTerm) {
    try {
      const creditors = await TradeCreditors.find(
        {
          isActive: true,
          status: "active",
          $or: [
            { customerName: { $regex: searchTerm, $options: "i" } },
            { accountCode: { $regex: searchTerm, $options: "i" } },
            { shortName: { $regex: searchTerm, $options: "i" } },
          ],
        },
        { accountCode: 1, customerName: 1, shortName: 1 }
      ).limit(10);

      return creditors;
    } catch (error) {
      throw createAppError("Error searching creditors", 500, "SEARCH_ERROR");
    }
  }

  // Get creditor statistics
  static async getCreditorStatistics() {
    try {
      const stats = await TradeCreditors.aggregate([
        {
          $group: {
            _id: null,
            totalCreditors: { $sum: 1 },
            activeCreditors: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            inactiveCreditors: {
              $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
            },
            suspendedCreditors: {
              $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
            },
          },
        },
      ]);

      const classificationStats = await TradeCreditors.aggregate([
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        general: stats[0] || {
          totalCreditors: 0,
          activeCreditors: 0,
          inactiveCreditors: 0,
          suspendedCreditors: 0,
        },
        byClassification: classificationStats,
      };
    } catch (error) {
      throw createAppError(
        "Error fetching creditor statistics",
        500,
        "STATS_ERROR"
      );
    }
  }
}

export default TradeCreditorService;