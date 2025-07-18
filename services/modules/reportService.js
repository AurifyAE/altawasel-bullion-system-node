import mongoose from "mongoose";
import Registry from "../../models/modules/Registry.js";
import moment from "moment";
import { log } from "console";

// ReportService class to handle stock ledger and movement reports
export class ReportService {

  async getMetalStockLedgerReport(filters) {
    try {
      console.log(filters);

      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildStockLedgerPipeline(validatedFilters);


      // Execute aggregation query  
      const reportData = await Registry.aggregate(pipeline);
      console.log(reportData);


      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: formattedData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
    }
  }


  async getStockMovementReport(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildStockLedgerPipeline(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: formattedData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(`Failed to generate stock movement report: ${error.message}`);
    }
  }


  validateFilters(filters) {
    // Destructure with comprehensive defaults
    const {
      fromDate,
      toDate,
      transactionType,
      division = [],
      voucher = [],
      stock = [],
      karat = [],
      accountType = [],
      grossWeight = false,
      pureWeight = false,
      showPcs = false,
      showMoved = false,
      showNetMovement = false,
      showMetalValue = false,
      showPurchaseSales = false,
      showPicture = false,
      showVatReports = false,
      showSummaryOnly = false,
      showWastage = false,
      withoutSap = false,
      showRfnDetails = false,
      showRetails = false,
      showCostIn = false,
      groupBy = [],
    } = filters;

    // Initialize dates
    let startDate = null;
    let endDate = null;

    // Handle date parsing and validation
    if (fromDate) {
      startDate = moment(fromDate).startOf("day").toDate();
    }
    if (toDate) {
      endDate = moment(toDate).endOf("day").toDate();
    }
    if (startDate && endDate && startDate > endDate) {
      throw new Error("From date cannot be greater than to date");
    }

    // Convert string arrays to ObjectIds (only for arrays that should contain ObjectIds)
    const formatObjectIds = (arr) =>
      arr
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    // Construct the final filter object
    const result = {
      // Always include arrays (even if empty) to prevent undefined errors
      division: formatObjectIds(division),
      voucher: voucher, // Keep as strings - don't convert to ObjectIds
      stock: formatObjectIds(stock),
      karat: formatObjectIds(karat),
      accountType: formatObjectIds(accountType),
      groupBy: groupBy, // Keep as strings array

      // Boolean flags - always include with their values
      grossWeight,
      pureWeight,
      showPcs,
      showMoved,
      showNetMovement,
      showMetalValue,
      showPurchaseSales,
      showPicture,
      showVatReports,
      showSummaryOnly,
      showWastage,
      withoutSap,
      showRfnDetails,
      showRetails,
      showCostIn,
    };

    // Only include optional properties if they exist
    if (startDate) result.startDate = startDate;
    if (endDate) result.endDate = endDate;
    if (transactionType) result.transactionType = transactionType;

    return result;
  }


  buildStockLedgerPipeline(filters) {
    const pipeline = [];

    // Base match conditions
    const matchConditions = {
      type: "GOLD_STOCK",
      isActive: true,
    };

    // Add date range filter if provided
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }



    // Stage 1: Initial filtering
    pipeline.push({ $match: matchConditions });

    // Stage 2: Join with metaltransactions collection
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTransaction",
      },
    });

    // Stage 3: Unwind metalTransaction array
    pipeline.push({
      $unwind: {
        path: "$metalTransaction",
        preserveNullAndEmptyArrays: false,
      },
    });


    // Conditionally filter based on transactionType
    if (filters.transactionType) {
      pipeline.push({
        $match: {
          "metalTransaction.transactionType": filters.transactionType,
        },
      });
    }


    // Stage 4: Filter by voucher if provided
    if (filters.voucher.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "metalTransaction.voucherType": { $in: filters.voucher } },
            { reference: { $in: filters.voucher.map((id) => id.toString()) } },
          ],
        },
      });
    }



    // Stage 5: Filter by account type if provided
    if (filters.accountType.length > 0) {
      pipeline.push({
        $match: {
          "metalTransaction.partyCode": { $in: filters.accountType },
        },
      });
    }
    

    // Stage 6: Unwind stock items
    pipeline.push({
      $unwind: {
        path: "$metalTransaction.stockItems",
        preserveNullAndEmptyArrays: false,
      },
    });


    // Stage 7: Join with metalstocks collection
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTransaction.stockItems.stockCode",
        foreignField: "_id",
        as: "stockDetails",
      },
    });

    // Stage 8: Unwind stockDetails array
    pipeline.push({
      $unwind: {
        path: "$stockDetails",
        preserveNullAndEmptyArrays: false,
      },
    });

    // Stage 9: Filter by stock if provided
    if (filters.stock.length > 0) {
      pipeline.push({
        $match: {
          "stockDetails._id": { $in: filters.stock },
        },
      });
    }

    // Stage 10: Filter by karat if provided
    if (filters.karat.length > 0) {
      pipeline.push({
        $match: {
          "stockDetails.karat": { $in: filters.karat },
        },
      });
    }

    // Stage 11: Filter by division if provided
    if (filters.division.length > 0) {
      pipeline.push({
        $match: {
          "stockDetails.metalType": { $in: filters.division },
        },
      });
    }

    // Stage 12: Join with additional details for display
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "stockDetails.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    pipeline.push({
      $lookup: {
        from: "divisionmasters",
        localField: "stockDetails.metalType",
        foreignField: "_id",
        as: "divisionDetails",
      },
    });

    pipeline.push({
      $lookup: {
        from: "accounts",
        localField: "metalTransaction.partyCode",
        foreignField: "_id",
        as: "partyDetails",
      },
    });

    // Stage 13: Project required fields
    pipeline.push({
      $project: {
        date: "$transactionDate",
        voucherNumber: "$metalTransaction.voucherNumber",
        partyName: { $arrayElemAt: ["$partyDetails.customerName", 0] },
        grossWeight: {
          $cond: {
            if: filters.grossWeight,
            then: "$metalTransaction.stockItems.grossWeight",
            else: null,
          },
        },
        pureWeight: {
          $cond: {
            if: filters.pureWeight,
            then: "$metalTransaction.stockItems.pureWeight",
            else: null,
          },
        },
        pcs: {
          $cond: {
            if: filters.showPcs,
            then: "$metalTransaction.stockItems.pieces",
            else: null,
          },
        },
        debit: "$debit",
        credit: "$credit",
        value: "$metalTransaction.stockItems.itemTotal.itemTotalAmount",
      },
    });

    // Stage 14: Sort by date (descending)
    pipeline.push({
      $sort: {
        date: -1,
        createdAt: -1,
      },
    });

    return pipeline;
  }

  /**
   * Formats raw report data into structured response
   * @param {Array} reportData - Raw aggregation results
   * @param {Object} filters - Validated filter parameters
   * @returns {Object} Formatted report with transactions and summary
   */
  formatReportData(reportData, filters) {
    if (!reportData || reportData.length === 0) {
      return {
        transactions: [],
        summary: {
          totalTransactions: 0,
          totalDebit: 0,
          totalCredit: 0,
          totalGrossWeight: 0,
          totalPcs: 0,
          totalPureWeight: 0,
          totalValue: 0,
        },
        appliedFilters: this.getAppliedFiltersInfo(filters),
      };
    }

    // Calculate summary statistics
    const summary = reportData.reduce(
      (acc, item) => {
        acc.totalTransactions += 1;
        acc.totalDebit += item.debit || 0;
        acc.totalCredit += item.credit || 0;
        if (filters.grossWeight && item.grossWeight) {
          acc.totalGrossWeight += item.grossWeight;
        }
        if (filters.pureWeight && item.pureWeight) {
          acc.totalPureWeight += item.pureWeight;
        }
        if (filters.showPcs && item.pcs) {
          acc.totalPcs += item.pcs;
        }
        acc.totalValue += item.value || 0;
        return acc;
      },
      {
        totalTransactions: 0,
        totalDebit: 0,
        totalCredit: 0,
        totalGrossWeight: 0,
        totalPureWeight: 0,
        totalPcs: 0,
        totalValue: 0,
      }
    );

    // Format individual transactions
    const transactions = reportData.map((item) => {
      const transaction = {
        date: moment(item.date).format("DD/MM/YYYY"),
        voucherNumber: item.voucherNumber,
        partyName: item.partyName,
        debit: item.debit || 0,
        credit: item.credit || 0,
        value: item.value || 0,
      };

      // Add conditional fields based on filters
      if (filters.grossWeight && item.grossWeight !== null) {
        transaction.grossWeight = item.grossWeight;
      }
      if (filters.pureWeight && item.pureWeight !== null) {
        transaction.pureWeight = item.pureWeight;
      }
      if (filters.showPcs && item.pcs !== null) {
        transaction.pcs = item.pcs;
      }

      return transaction;
    });

    return {
      transactions,
      summary,
      appliedFilters: this.getAppliedFiltersInfo(filters),
    };
  }

  /**
   * Generates information about applied filters
   * @param {Object} filters - Validated filter parameters
   * @returns {Object} Summary of applied filters
   */
  getAppliedFiltersInfo(filters) {
    return {
      dateRange: filters.startDate && filters.endDate
        ? `${moment(filters.startDate).format("DD/MM/YYYY")} to ${moment(filters.endDate).format("DD/MM/YYYY")}`
        : "All dates",
      hasStockFilter: filters.stock.length > 0,
      hasKaratFilter: filters.karat.length > 0,
      hasDivisionFilter: filters.division.length > 0,
      hasVoucherFilter: filters.voucher.length > 0,
      hasAccountTypeFilter: filters.accountType.length > 0,
      showGrossWeight: filters.grossWeight,
      showPureWeight: filters.pureWeight,
      showPcs: filters.showPcs,
    };
  }
}