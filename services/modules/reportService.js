import mongoose from "mongoose";
import Registry from "../../models/modules/Registry.js";
import moment from "moment";

export class ReportService {
  async getMetalStockLedgerReport(filters) {
    try {
      // Validate and format filters
      const validatedFilters = this.validateFilters(filters);


      // Build aggregation pipeline
      const pipeline = this.buildStockLedgerPipeline(validatedFilters);

      // aggregate the pipeline
      const reportData = await Registry.aggregate(pipeline);

      // Format response
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
      // Validate and format filters
      const validatedFilters = this.validateFilters(filters);

      // Build aggregation pipeline
      const pipeline = this.buildStockLedgerPipeline(validatedFilters);

      // Execute aggregation
      const reportData = await Registry.aggregate(pipeline);

      // Format response
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

  validateFilters(filters) {
    const {
      fromDate,
      toDate,
      division = [],
      voucher = [],
      stock = [],
      karat = [],
      accountType = [],
      categoryCode = [],
      type = [],
      supplierRef = [],
      countryDetails = [],
      supplier = [],
      purchaseRef = [],
      grossWeight = false,
      pureWeight = false,
      showPcs = false,
      showMetalValue = false,
      showPurchaseSales = false,
      showMoved = false,
      showNetMovement = false,
      showPicture = false,
      groupBy = [],
    } = filters;

    // Validate date range
    // if (!fromDate || !toDate) {
    //   throw new Error("From date and to date are required");
    // }

    const startDate = moment(fromDate).startOf("day").toDate();
    const endDate = moment(toDate).endOf("day").toDate();

    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new Error("From date cannot be greater than to date");
      }
    }

    // Convert string arrays to ObjectIds
    const formatObjectIds = (arr) => {
      return arr
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    };

    return {
      startDate,
      endDate,
      division: formatObjectIds(division),
      voucher: formatObjectIds(voucher),
      stock: formatObjectIds(stock),
      karat: formatObjectIds(karat),
      accountType: formatObjectIds(accountType),
      grossWeight,
      pureWeight,
      showPcs,
    };
  }

  buildStockLedgerPipeline(filters) {
    const pipeline = [];

    const matchConditions = {
      type: "GOLD_STOCK",
      isActive: true,
    };

    // Add dynamic date conditions if provided
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};

      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    const matchStage = {
      $match: matchConditions,
    };

    pipeline.push(matchStage);

    // Stage 2: Lookup MetalTransaction details using transactionId
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTransaction",
      },
    });

    // Stage 3: Unwind metalTransaction
    pipeline.push({
      $unwind: {
        path: "$metalTransaction",
        preserveNullAndEmptyArrays: false,
      },
    });

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

    // Stage 5: Filter by account type (partyCode) if provided
    if (filters.accountType.length > 0) {
      pipeline.push({
        $match: {
          "metalTransaction.partyCode": {
            $in: filters.accountType,
          },
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

    // return pipeline
    // Stage 7: Lookup MetalStock details
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTransaction.stockItems.stockCode",
        foreignField: "_id",
        as: "stockDetails",
      },
    });

    // Stage 8: Unwind stockDetails
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
          "stockDetails._id": {
            $in: filters.stock,
          },
        },
      });
    }


    // Stage 10: Filter by karat if provided
    if (filters.karat.length > 0) {
      pipeline.push({
        $match: {
          "stockDetails.karat": {
            $in: filters.karat,
          },
        },
      });
    }

    // Stage 11: Filter by division if provided
    if (filters.division.length > 0) {
      pipeline.push({
        $match: {
          "stockDetails.metalType": {
            $in: filters.division,
          },
        },
      });
    }

    // Stage 12: Lookup additional details for display
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

    // Stage 13: Project final output with required fields
    pipeline.push({
      $project: {
        date: "$transactionDate",
        voucherNumber: "$metalTransaction.voucherNumber",
        partyName: { $arrayElemAt: ["$partyDetails.customerName", 0] },
        grossWeight: {
          $cond: {
            if: { $literal: filters.grossWeight },
            then: "$metalTransaction.stockItems.grossWeight",
            else: null,
          },
        },
        pureWeight: {
          $cond: {
            if: { $literal: filters.pureWeight },
            then: "$metalTransaction.stockItems.pureWeight",
            else: null,
          },
        },
        pcs: {
          $cond: {
            if: { $literal: filters.showPcs },
            then: "$metalTransaction.stockItems.pieces",
            else: null,
          },
        },
        debit: "$debit",
        credit: "$credit",
        value: "$metalTransaction.stockItems.itemTotal.itemTotalAmount",
      },
    });

    // Stage 14: Sort by transaction date (newest first)
    pipeline.push({
      $sort: {
        date: -1,
        createdAt: -1,
      },
    });

    return pipeline;
  }

  formatReportData(reportData, filters) {
    if (!reportData || reportData.length === 0) {
      return {
        transactions: [],
        summary: {
          totalTransactions: 0,
          totalDebit: 0,
          totalCredit: 0,
          totalGrossWeight: 0,
          totalPureWeight: 0,
          totalPieces: 0,
          totalValue: 0,
        },
        appliedFilters: this.getAppliedFiltersInfo(filters),
      };
    }

    // Calculate summary
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
          acc.totalPieces += item.pcs;
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
        totalPieces: 0,
        totalValue: 0,
      }
    );

    // Format transactions
    const transactions = reportData.map((item) => {
      const transaction = {
        date: moment(item.date).format("DD/MM/YYYY"),
        voucherNumber: item.voucherNumber,
        partyName: item.partyName,
        debit: item.debit || 0,
        credit: item.credit || 0,
        value: item.value || 0,
      };

      // Conditionally add fields based on filters
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

  getAppliedFiltersInfo(filters) {
    return {
      dateRange: `${moment(filters.startDate).format("DD/MM/YYYY")} to ${moment(
        filters.endDate
      ).format("DD/MM/YYYY")}`,
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