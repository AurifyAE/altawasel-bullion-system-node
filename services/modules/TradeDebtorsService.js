import TradeDebtors from "../../models/modules/TradeDebtors.js";
import { createAppError } from "../../utils/errorHandler.js";
import { deleteS3File, deleteMultipleS3Files } from "../../utils/s3Utils.js";

class TradeDebtorsService {
  // Create new trade debtor
  static async createTradeDebtor(debtorData, adminId) {
    try {
      // Check if account code already exists
      const isCodeExists = await TradeDebtors.isAccountCodeExists(
        debtorData.accountCode
      );
      if (isCodeExists) {
        throw createAppError(
          "Account code already exists",
          400,
          "DUPLICATE_ACCOUNT_CODE"
        );
      }

      // Validate required nested data
      if (!debtorData.addresses || debtorData.addresses.length === 0) {
        throw createAppError(
          "At least one address is required",
          400,
          "MISSING_ADDRESS"
        );
      }

      if (!debtorData.employees || debtorData.employees.length === 0) {
        throw createAppError(
          "At least one employee contact is required",
          400,
          "MISSING_EMPLOYEE"
        );
      }

      // Set created by
      debtorData.createdBy = adminId;

      // Create trade debtor
      const tradeDebtor = new TradeDebtors(debtorData);
      await tradeDebtor.save();

      // Populate references
      await tradeDebtor.populate([
        {
          path: "acDefinition.currencies.currency",
          select: "currencyCode description",
        },
        { path: "acDefinition.branches.branch", select: "code name" },
        { path: "limitsMargins.currency", select: "currencyCode description" },
        { path: "createdBy", select: "name email" },
      ]);

      return tradeDebtor;
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

  // Get all trade debtors with pagination and filters
  static async getAllTradeDebtors(options = {}) {
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

      const [tradeDebtors, total] = await Promise.all([
        TradeDebtors.find(query)
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
        TradeDebtors.countDocuments(query),
      ]);

      return {
        tradeDebtors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      };
    } catch (error) {
      throw createAppError("Error fetching trade debtors", 500, "FETCH_ERROR");
    }
  }

  // Get trade debtor by ID
  static async getTradeDebtorById(id) {
    try {
      const tradeDebtor = await TradeDebtors.findById(id).populate([
        {
          path: "acDefinition.currencies.currency",
          select: "code name symbol",
        },
        { path: "acDefinition.branches.branch", select: "code name" },
        { path: "limitsMargins.currency", select: "code name symbol" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" },
      ]);

      if (!tradeDebtor) {
        throw createAppError("Trade debtor not found", 404, "DEBTOR_NOT_FOUND");
      }

      return tradeDebtor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade debtor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }
  // Helper function to extract all S3 keys from a trade debtor document
  static extractS3Keys(tradeDebtor) {
    const s3Keys = [];

    // Extract from VAT/GST documents
    if (tradeDebtor.vatGstDetails?.documents?.length) {
      tradeDebtor.vatGstDetails.documents.forEach((doc) => {
        if (doc.s3Key) {
          s3Keys.push(doc.s3Key);
        }
      });
    }

    // Extract from KYC documents
    if (tradeDebtor.kycDetails?.length) {
      tradeDebtor.kycDetails.forEach((kyc) => {
        if (kyc.documents?.length) {
          kyc.documents.forEach((doc) => {
            if (doc.s3Key) {
              s3Keys.push(doc.s3Key);
            }
          });
        }
      });
    }

    return s3Keys;
  }

  // Helper function to extract S3 keys from update data
  static extractS3KeysFromUpdateData(updateData) {
    const s3Keys = [];

    // Extract from VAT/GST documents in update data
    if (updateData.vatGstDetails?.documents?.length) {
      updateData.vatGstDetails.documents.forEach((doc) => {
        if (doc.s3Key) {
          s3Keys.push(doc.s3Key);
        }
      });
    }

    // Extract from KYC documents in update data
    if (updateData.kycDetails?.length) {
      updateData.kycDetails.forEach((kyc) => {
        if (kyc.documents?.length) {
          kyc.documents.forEach((doc) => {
            if (doc.s3Key) {
              s3Keys.push(doc.s3Key);
            }
          });
        }
      });
    }

    return s3Keys;
  }

  static async updateTradeDebtor(id, updateData, adminId) {
    try {
      const tradeDebtor = await TradeDebtors.findById(id);
      if (!tradeDebtor) {
        throw createAppError("Trade debtor not found", 404, "DEBTOR_NOT_FOUND");
      }

      // Check if account code is being updated and if it already exists
      if (
        updateData.accountCode &&
        updateData.accountCode !== tradeDebtor.accountCode
      ) {
        const isCodeExists = await TradeDebtors.isAccountCodeExists(
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

      // Handle file replacements and deletions
      const filesToDelete = [];

      // Check if VAT documents are being replaced
      if (updateData.vatGstDetails?.documents) {
        const oldVatDocs = tradeDebtor.vatGstDetails?.documents || [];

        // If we're completely replacing VAT documents (not appending)
        if (updateData._replaceVatDocuments) {
          oldVatDocs.forEach((doc) => {
            if (doc.s3Key) {
              filesToDelete.push(doc.s3Key);
            }
          });
        }
        // If we're selectively removing documents
        else if (updateData._removeVatDocuments?.length) {
          updateData._removeVatDocuments.forEach((docId) => {
            const docToRemove = oldVatDocs.find(
              (doc) => doc._id?.toString() === docId
            );
            if (docToRemove?.s3Key) {
              filesToDelete.push(docToRemove.s3Key);
            }
          });

          // Filter out removed documents
          updateData.vatGstDetails.documents = [
            ...oldVatDocs.filter(
              (doc) =>
                !updateData._removeVatDocuments.includes(doc._id?.toString())
            ),
            ...updateData.vatGstDetails.documents,
          ];
        }
      }

      // Check if KYC documents are being replaced
      if (updateData.kycDetails?.length) {
        updateData.kycDetails.forEach((kycUpdate, index) => {
          if (kycUpdate.documents) {
            const oldKycDocs = tradeDebtor.kycDetails?.[index]?.documents || [];

            // If we're completely replacing KYC documents for this entry
            if (kycUpdate._replaceDocuments) {
              oldKycDocs.forEach((doc) => {
                if (doc.s3Key) {
                  filesToDelete.push(doc.s3Key);
                }
              });
            }
            // If we're selectively removing documents
            else if (kycUpdate._removeDocuments?.length) {
              kycUpdate._removeDocuments.forEach((docId) => {
                const docToRemove = oldKycDocs.find(
                  (doc) => doc._id?.toString() === docId
                );
                if (docToRemove?.s3Key) {
                  filesToDelete.push(docToRemove.s3Key);
                }
              });

              // Filter out removed documents and add new ones
              kycUpdate.documents = [
                ...oldKycDocs.filter(
                  (doc) =>
                    !kycUpdate._removeDocuments.includes(doc._id?.toString())
                ),
                ...kycUpdate.documents,
              ];
            }
          }
        });
      }

      // Delete old S3 files if any need to be removed
      if (filesToDelete.length > 0) {
        console.log(`Deleting ${filesToDelete.length} replaced S3 files`);

        try {
          await deleteMultipleS3Files(filesToDelete);
        } catch (s3Error) {
          console.warn("Warning: Could not delete some old S3 files:", s3Error);
          // Don't fail the update operation if S3 deletion fails
        }
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

      // Set updated by
      updateData.updatedBy = adminId;

      const updatedTradeDebtor = await TradeDebtors.findByIdAndUpdate(
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

      return {
        ...updatedTradeDebtor.toObject(),
        _filesManagement: {
          filesDeleted: filesToDelete.length,
          deletedKeys: filesToDelete,
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
        throw createAppError("Invalid trade debtor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Delete trade debtor (soft delete)
  static async deleteTradeDebtor(id, adminId) {
    try {
      const tradeDebtor = await TradeDebtors.findById(id);
      if (!tradeDebtor) {
        throw createAppError("Trade debtor not found", 404, "DEBTOR_NOT_FOUND");
      }

      // Soft delete - mark as inactive
      const deletedTradeDebtor = await TradeDebtors.findByIdAndUpdate(
        id,
        {
          isActive: false,
          status: "inactive",
          updatedBy: adminId,
        },
        { new: true }
      );

      return deletedTradeDebtor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade debtor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Hard delete trade debtor
  static async hardDeleteTradeDebtor(id) {
    try {
      const tradeDebtor = await TradeDebtors.findById(id);
      if (!tradeDebtor) {
        throw createAppError("Trade debtor not found", 404, "DEBTOR_NOT_FOUND");
      }

      // Extract all S3 keys from the document
      const s3Keys = this.extractS3Keys(tradeDebtor);

      // Delete the trade debtor from database first
      await TradeDebtors.findByIdAndDelete(id);

      // Delete associated S3 files if any exist
      if (s3Keys.length > 0) {
        console.log(
          `Deleting ${s3Keys.length} S3 files for trade debtor ${id}`
        );

        try {
          const deletionResult = await deleteMultipleS3Files(s3Keys);

          if (!deletionResult.success) {
            console.warn(
              "Some S3 files could not be deleted:",
              deletionResult.failed
            );
          }

          return {
            message: "Trade debtor permanently deleted",
            filesDeleted: {
              total: s3Keys.length,
              successful: deletionResult.successful?.length || 0,
              failed: deletionResult.failed?.length || 0,
            },
          };
        } catch (s3Error) {
          console.error("Error deleting S3 files:", s3Error);
          // Don't fail the entire operation if S3 deletion fails
          return {
            message:
              "Trade debtor permanently deleted (warning: some files may remain in S3)",
            filesDeleted: {
              total: s3Keys.length,
              successful: 0,
              failed: s3Keys.length,
              error: s3Error.message,
            },
          };
        }
      }

      return {
        message: "Trade debtor permanently deleted",
        filesDeleted: { total: 0 },
      };
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade debtor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Toggle status
  static async toggleStatus(id, adminId) {
    try {
      const tradeDebtor = await TradeDebtors.findById(id);
      if (!tradeDebtor) {
        throw createAppError("Trade debtor not found", 404, "DEBTOR_NOT_FOUND");
      }

      const newStatus = tradeDebtor.status === "active" ? "inactive" : "active";
      const updatedTradeDebtor = await TradeDebtors.findByIdAndUpdate(
        id,
        {
          status: newStatus,
          isActive: newStatus === "active",
          updatedBy: adminId,
        },
        { new: true }
      );

      return updatedTradeDebtor;
    } catch (error) {
      if (error.name === "CastError") {
        throw createAppError("Invalid trade debtor ID", 400, "INVALID_ID");
      }
      throw error;
    }
  }

  // Get active debtors for dropdown
  static async getActiveDebtorsList() {
    try {
      const debtors = await TradeDebtors.find(
        { isActive: true, status: "active" },
        { accountCode: 1, customerName: 1, shortName: 1 }
      ).sort({ customerName: 1 });

      return debtors;
    } catch (error) {
      throw createAppError(
        "Error fetching active debtors list",
        500,
        "FETCH_ERROR"
      );
    }
  }

  // Search debtors by name or code
  static async searchDebtors(searchTerm) {
    try {
      const debtors = await TradeDebtors.find(
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

      return debtors;
    } catch (error) {
      throw createAppError("Error searching debtors", 500, "SEARCH_ERROR");
    }
  }

  // Get debtor statistics
  static async getDebtorStatistics() {
    try {
      const stats = await TradeDebtors.aggregate([
        {
          $group: {
            _id: null,
            totalDebtors: { $sum: 1 },
            activeDebtors: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            inactiveDebtors: {
              $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
            },
            suspendedDebtors: {
              $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
            },
          },
        },
      ]);

      const classificationStats = await TradeDebtors.aggregate([
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        general: stats[0] || {
          totalDebtors: 0,
          activeDebtors: 0,
          inactiveDebtors: 0,
          suspendedDebtors: 0,
        },
        byClassification: classificationStats,
      };
    } catch (error) {
      throw createAppError(
        "Error fetching debtor statistics",
        500,
        "STATS_ERROR"
      );
    }
  }
}

export default TradeDebtorsService;
