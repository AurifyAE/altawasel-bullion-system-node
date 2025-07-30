import mongoose from "mongoose";
import Registry from "../../models/modules/Registry.js";
import moment from "moment";
import { log } from "console";
import Inventory from "../../models/modules/inventory.js";

// ReportService class to handle stock ledger and movement reports
export class ReportService {
  async getReportsData(filters) {
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
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getStockAnalysis(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildStockAnalysis(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: false,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getSalesAnalysis(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.saleValidateFilters(filters);

      // Construct MongoDB aggregation pipeline

      // Execute aggregation query
      const pipeline = this.buildSalesAnalysis(validatedFilters);
      console.log("Pipeline:", JSON.stringify(pipeline, null, 2));

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline).exec();
      console.log("Aggregation Result:", JSON.stringify(reportData, null, 2));

      return {
        success: false,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }
  async getPurchaseMetalReport(filters) {
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
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getMetalStockLedgerReport(filters) {
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
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getStockMovementReport(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildStockMovementPipeline(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);
      console.log("====================================");
      console.log(reportData);
      console.log("====================================");

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate stock movement report: ${error.message}`
      );
    }
  }

  async getStockBalanceReport(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters, true);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildStockPipeline(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getTransactionSummary(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.buildTransactionSummaryPipeline(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  async getOwnStockReport(filters) {
    try {
      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.OwnStockPipeLine(validatedFilters);

      // Execute aggregation query
      const reportData = await Registry.aggregate(pipeline);

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }

  validateFilters(filters, isStock) {
    const {
      type,
      fromDate,
      discount,
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
      costFilter,
      groupByRange = {
        stockCode: [],
        categoryCode: [],
        karat: [],
        type: [],
        supplier: [],
        purchaseRef: [],
      },
      costCenter,
    } = filters;

    // Initialize dates
    let startDate = null;
    let endDate = null;

    if (fromDate) startDate = moment(fromDate).startOf("day").toDate();
    if (toDate) endDate = moment(toDate).endOf("day").toDate();
    if (startDate && endDate && startDate > endDate) {
      throw new Error("From date cannot be greater than to date");
    }

    const formatObjectIds = (arr) =>
      arr
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const result = {
      division: formatObjectIds(division),
      voucher,
      stock: formatObjectIds(stock),
      karat: formatObjectIds(karat),
      accountType: formatObjectIds(accountType),
      groupBy,
      type,
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
      costCenter,
      discount,
      costFilter,
    };

    if (startDate) result.startDate = startDate;
    if (endDate) result.endDate = endDate;
    if (transactionType) result.transactionType = transactionType;

    // ✅ Conditionally add groupByRange if it has any non-empty array
    const hasGroupByRangeValues = Object.values(groupByRange).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );

    if (isStock) {
      if (hasGroupByRangeValues) {
        const formattedGroupByRange = {};
        for (const [key, value] of Object.entries(groupByRange)) {
          if (
            ["karat", "categoryCode", "supplier", "type", "brand"].includes(key)
          ) {
            formattedGroupByRange[key] = formatObjectIds(value);
          } else {
            // For stockCode, size, color — keep them as-is (string arrays)
            formattedGroupByRange[key] = value;
          }
        }
        result.groupByRange = formattedGroupByRange;
      }
    } else {
      if (hasGroupByRangeValues) {
        // Optionally, convert IDs to ObjectIds if needed
        const formattedGroupByRange = {};
        for (const [key, value] of Object.entries(groupByRange)) {
          formattedGroupByRange[key] = formatObjectIds(value);
        }
        result.groupByRange = formattedGroupByRange;
      }
    }

    return result;
  }

  saleValidateFilters(filters) {
    if (!filters.fromDate || !filters.toDate) {
      throw new Error("From date and to date are required");
    }
    const fromDate = new Date(filters.fromDate);
    const toDate = new Date(filters.toDate);
    if (fromDate > toDate) {
      throw new Error("From date cannot be greater than to date");
    }
    return {
      ...filters,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      groupBy: filters.groupBy || ["stockCode"],
      groupByRange: {
        stockCode: filters.groupByRange?.stockCode || [],
        categoryCode: filters.groupByRange?.categoryCode || [],
        karat: filters.groupByRange?.karat || [],
        type: filters.groupByRange?.type || [],
        size: filters.groupByRange?.size || [],
        color: filters.groupByRange?.color || [],
        brand: filters.groupByRange?.brand || [],
      },
    };
  }

  buildStockLedgerPipeline(filters) {
    const pipeline = [];

    const matchConditions = {
      isActive: true,
    };

    // Make `type` dynamic if provided
    if (filters.type) {
      matchConditions.type = filters.type;
    }

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

    // Stage 11.1: Apply groupByRange filters if present
    if (filters.groupByRange && typeof filters.groupByRange === "object") {
      const groupByMap = {
        stockCode: "stockDetails._id",
        categoryCode: "stockDetails.categoryCode",
        karat: "stockDetails.karat",
        type: "stockDetails.type",
        supplierRef: "stockDetails.supplierRef",
        countryDetails: "stockDetails.countryDetails",
        supplier: "stockDetails.supplier",
        purchaseRef: "stockDetails.purchaseRef",
      };

      for (const [key, path] of Object.entries(groupByMap)) {
        const values = filters.groupByRange[key];
        if (Array.isArray(values) && values.length > 0) {
          pipeline.push({
            $match: {
              [path]: { $in: values },
            },
          });
        }
      }
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
        stockCode: "$stockDetails.code",
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

  buildSalesAnalysis(filters) {
    // Enhanced input validation
    if (!filters || typeof filters !== "object") {
      throw new Error("Filters object is required");
    }
    if (!filters.fromDate || !filters.toDate) {
      throw new Error("fromDate and toDate are required");
    }

    const pipeline = [];
    const currentDate = new Date();
    let fromDate, toDate;

    // Date validation
    try {
      fromDate = new Date(filters.fromDate);
      toDate = new Date(filters.toDate);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error("Invalid date format");
      }
      if (fromDate > toDate) {
        throw new Error("fromDate cannot be greater than toDate");
      }
    } catch (error) {
      throw new Error(`Date validation failed: ${error.message}`);
    }

    // Adjust dates
    if (fromDate > currentDate)
      fromDate = new Date(currentDate.getFullYear(), 0, 1);
    if (toDate > currentDate) toDate = currentDate;
    const financialYearStart = new Date(currentDate.getFullYear(), 0, 1);

    // Convert stock codes to ObjectId
    const stockCodes =
      filters.groupByRange?.stockCode?.map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (error) {
          throw new Error(`Invalid ObjectId in stockCode filter: ${id}`);
        }
      }) || [];

    // Use $facet to process sales and purchases separately
    pipeline.push({
      $facet: {
        // Sales pipeline
        salesData: [
          {
            $match: {
              isActive: true,
              transactionDate: { $gte: fromDate, $lte: toDate },
              ...(filters.division?.length > 0 && {
                costCenter: { $in: filters.division },
              }),
              ...(filters.voucher?.length > 0 && {
                $or: filters.voucher.map((voucher) => ({
                  reference: {
                    $regex: String(voucher).replace(
                      /[.*+?^${}()|[\]\\]/g,
                      "\\$&"
                    ),
                    $options: "i",
                  },
                })),
              }),
            },
          },
          {
            $lookup: {
              from: "metaltransactions",
              let: { metalTxnId: "$metalTransactionId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$metalTxnId"] },
                    transactionType: "sale",
                    isActive: true,
                    status: { $in: ["confirmed", "completed", "draft"] },
                  },
                },
              ],
              as: "metalTxnInfo",
            },
          },
          { $match: { "metalTxnInfo.0": { $exists: true } } },
          { $unwind: "$metalTxnInfo" },
          {
            $addFields: {
              "metalTxnInfo.stockItems": {
                $ifNull: ["$metalTxnInfo.stockItems", []],
              },
            },
          },
          {
            $unwind: {
              path: "$metalTxnInfo.stockItems",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $lookup: {
              from: "metalstocks",
              let: { stockCode: "$metalTxnInfo.stockItems.stockCode" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$stockCode"] } } },
              ],
              as: "stockDetails",
            },
          },
          {
            $unwind: {
              path: "$stockDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          ...(stockCodes.length > 0
            ? [{ $match: { "stockDetails._id": { $in: stockCodes } } }]
            : []),
          {
            $group: {
              _id: {
                transactionId: "$transactionId",
                description: "$description",
                stockDescription: "$stockDetails.description",
                stockCode: "$stockDetails._id",
              },
              salesMkgValue: {
                $sum: {
                  $toDouble: {
                    $ifNull: [
                      "$metalTxnInfo.stockItems.makingCharges.amount",
                      0,
                    ],
                  },
                },
              },
              salesGrossQty: {
                $sum: {
                  $toDouble: {
                    $ifNull: ["$metalTxnInfo.stockItems.grossWeight", 0],
                  },
                },
              },
              salesPcs: {
                $sum: {
                  $toInt: { $ifNull: ["$metalTxnInfo.stockItems.pieces", 0] },
                },
              },
            },
          },
          // Debugging stage for sales
          {
            $project: {
              _id: 1,
              salesMkgValue: 1,
              salesGrossQty: 1,
              salesPcs: 1,
              debugSales: {
                transactionId: "$_id.transactionId",
                stockCode: "$_id.stockCode",
                salesDateRange: {
                  from: fromDate.toISOString(),
                  to: toDate.toISOString(),
                },
              },
            },
          },
        ],
        // Purchase pipeline
        purchaseData: [
          {
            $match: {
              isActive: true,
              transactionDate: {
                $gte: "2025-01-01T00:00:00.000Z",
                $lte: "2025-07-28T00:00:00.000Z",
              },
            },
          },
          {
            $lookup: {
              from: "metaltransactions",
              let: { regMetalTxnId: "$metalTransactionId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$regMetalTxnId"] },
                    transactionType: "purchase",
                    isActive: true,
                    // Include status filter if necessary
                    // status: { $in: ["confirmed", "completed"] },
                  },
                },
              ],
              as: "metalTxn",
            },
          },
          { $match: { "metalTxn.0": { $exists: true } } },
          { $unwind: "$metalTxn" },
          { $unwind: "$metalTxn.stockItems" },
          ...(stockCodes.length > 0
            ? [
                {
                  $match: {
                    "metalTxn.stockItems.stockCode": { $in: stockCodes },
                  },
                },
              ]
            : []),
          {
            $group: {
              _id: null,
              totalPurchaseMkgAmount: {
                $sum: {
                  $toDouble: {
                    $ifNull: ["$metalTxn.stockItems.makingCharges.amount", 0],
                  },
                },
              },
              totalPurchaseGrossQty: {
                $sum: {
                  $toDouble: {
                    $ifNull: ["$metalTxn.stockItems.grossWeight", 0],
                  },
                },
              },
              purchaseTransactionCount: { $sum: 1 },
            },
          },
          // Debugging stage for purchases
          {
            $project: {
              totalPurchaseMkgAmount: 1,
              totalPurchaseGrossQty: 1,
              purchaseTransactionCount: 1,
              debugPurchases: {
                dateRange: {
                  from: financialYearStart.toISOString(),
                  to: currentDate.toISOString(),
                },
                stockCodes: stockCodes,
              },
            },
          },
        ],
      },
    });

    // Merge sales and purchase data
    pipeline.push({
      $project: {
        salesData: "$salesData",
        purchaseInfo: {
          $ifNull: [
            { $arrayElemAt: ["$purchaseData", 0] },
            {
              totalPurchaseMkgAmount: 0,
              totalPurchaseGrossQty: 0,
              purchaseTransactionCount: 0,
              debugPurchases: {
                dateRange: {
                  from: financialYearStart.toISOString(),
                  to: currentDate.toISOString(),
                },
                stockCodes: stockCodes,
              },
            },
          ],
        },
      },
    });

    // Unwind sales data
    pipeline.push({
      $unwind: { path: "$salesData", preserveNullAndEmptyArrays: true },
    });

    // Calculate purchase cost per unit
    pipeline.push({
      $addFields: {
        purchaseCostPerUnit: {
          $cond: [
            {
              $and: [
                { $gt: ["$purchaseInfo.totalPurchaseGrossQty", 0] },
                { $gt: ["$purchaseInfo.totalPurchaseMkgAmount", 0] },
              ],
            },
            {
              $divide: [
                "$purchaseInfo.totalPurchaseMkgAmount",
                "$purchaseInfo.totalPurchaseGrossQty",
              ],
            },
            0,
          ],
        },
        salesMkgValue: "$salesData.salesMkgValue",
        salesGrossQty: "$salesData.salesGrossQty",
        salesPcs: "$salesData.salesPcs",
        _id: "$salesData._id",
        debugSales: "$salesData.debugSales",
        debugPurchases: "$purchaseInfo.debugPurchases",
      },
    });

    // Calculate cost and sales rate per unit
    pipeline.push({
      $addFields: {
        cost: {
          $cond: [
            {
              $and: [
                { $gt: ["$salesGrossQty", 0] },
                { $gt: ["$purchaseCostPerUnit", 0] },
              ],
            },
            { $multiply: ["$purchaseCostPerUnit", "$salesGrossQty"] },
            0,
          ],
        },
        salesRatePerUnit: {
          $cond: [
            { $gt: ["$salesGrossQty", 0] },
            { $divide: ["$salesMkgValue", "$salesGrossQty"] },
            0,
          ],
        },
      },
    });

    // Calculate gross profit
    pipeline.push({
      $addFields: {
        grossProfit: {
          MkgAmount: { $subtract: ["$salesMkgValue", "$cost"] },
          MkgRate: { $subtract: ["$salesRatePerUnit", "$purchaseCostPerUnit"] },
        },
      },
    });

    // Apply cost filter
    if (
      filters.costFilter?.amount &&
      typeof filters.costFilter.amount === "number"
    ) {
      pipeline.push({
        $match: { salesMkgValue: { $gt: filters.costFilter.amount } },
      });
    }

    // Final projection
    pipeline.push({
      $project: {
        _id: 0,
        CODE: { $ifNull: ["$_id.transactionId", "N/A"] },
        DESCRIPTION: { $ifNull: ["$_id.description", "N/A"] },
        STOCK_NAME: { $ifNull: ["$_id.stockDescription", "N/A"] },
        STOCK_CODE: { $ifNull: ["$_id.stockCode", null] },
        Sales: {
          MkgValue: { $round: [{ $ifNull: ["$salesMkgValue", 0] }, 2] },
          GrossQty: { $round: [{ $ifNull: ["$salesGrossQty", 0] }, 3] },
          Pcs: { $ifNull: ["$salesPcs", 0] },
        },
        COST: { $round: [{ $ifNull: ["$cost", 0] }, 2] },
        Gross_Profit: {
          MkgAmount: {
            $round: [{ $ifNull: ["$grossProfit.MkgAmount", 0] }, 2],
          },
          MkgRate: { $round: [{ $ifNull: ["$grossProfit.MkgRate", 0] }, 4] },
        },
        Metrics: {
          purchaseCostPerUnit: {
            $round: [{ $ifNull: ["$purchaseCostPerUnit", 0] }, 4],
          },
          salesRatePerUnit: {
            $round: [{ $ifNull: ["$salesRatePerUnit", 0] }, 4],
          },
          profitMargin: {
            $cond: [
              { $gt: ["$salesMkgValue", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$grossProfit.MkgAmount", "$salesMkgValue"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },
        },
        Debug: {
          totalPurchaseMkgAmount: {
            $ifNull: ["$purchaseInfo.totalPurchaseMkgAmount", 0],
          },
          totalPurchaseGrossQty: {
            $ifNull: ["$purchaseInfo.totalPurchaseGrossQty", 0],
          },
          purchaseTransactionCount: {
            $ifNull: ["$purchaseInfo.purchaseTransactionCount", 0],
          },
          dateInfo: {
            financialYearStart: financialYearStart.toISOString(),
            currentDate: currentDate.toISOString(),
            salesDateRange: {
              from: fromDate.toISOString(),
              to: toDate.toISOString(),
            },
          },
          debugSales: "$debugSales",
          debugPurchases: "$debugPurchases",
        },
      },
    });

    // Handle empty results
    pipeline.push({
      $facet: {
        data: [],
        summary: [
          {
            $group: {
              _id: null,
              totalRecords: { $sum: 1 },
              totalSales: { $sum: "$Sales.MkgValue" },
              totalCost: { $sum: "$COST" },
              totalProfit: { $sum: "$Gross_Profit.MkgAmount" },
            },
          },
        ],
      },
    });

    pipeline.push({
      $project: {
        results: {
          $cond: [
            { $eq: [{ $size: "$data" }, 0] },
            [
              {
                CODE: "NO_DATA",
                DESCRIPTION:
                  "No sales transactions found for the specified criteria",
                STOCK_NAME: "N/A",
                STOCK_CODE: null,
                Sales: { MkgValue: 0, GrossQty: 0, Pcs: 0 },
                COST: 0,
                Gross_Profit: { MkgAmount: 0, MkgRate: 0 },
                Metrics: {
                  purchaseCostPerUnit: 0,
                  salesRatePerUnit: 0,
                  profitMargin: 0,
                },
                Debug: {
                  totalPurchaseMkgAmount: 0,
                  totalPurchaseGrossQty: 0,
                  purchaseTransactionCount: 0,
                  dateInfo: {
                    financialYearStart: financialYearStart.toISOString(),
                    currentDate: currentDate.toISOString(),
                    salesDateRange: {
                      from: fromDate.toISOString(),
                      to: toDate.toISOString(),
                    },
                  },
                },
              },
            ],
            "$data",
          ],
        },
        summary: { $arrayElemAt: ["$summary", 0] },
      },
    });

    pipeline.push({ $unwind: "$results" });
    pipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$results",
            { _summary: { $ifNull: ["$summary", null] } },
          ],
        },
      },
    });
    pipeline.push({ $sort: { CODE: 1, "Sales.MkgValue": -1 } });

    return pipeline;
  }

  buildStockAnalysis(filters) {
    const pipeline = [];

    // Base match conditions for Registry
    const matchConditions = {
      type: "GOLD_STOCK",
      isActive: true,
    };

    // Add date range filter - Fixed date filtering
    if (filters.startDate && filters.endDate) {
      matchConditions.transactionDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    } else if (filters.fromDate) {
      matchConditions.transactionDate = {
        $gte: new Date(filters.startDate),
      };
    } else if (filters.endDate) {
      matchConditions.transactionDate = {
        $lte: new Date(filters.endDate),
      };
    }

    // Handle transactionType filter - Only apply if not 'all'
    if (filters.transactionType && filters.transactionType !== "all") {
      switch (filters.transactionType.toLowerCase()) {
        case "sales":
        case "sale":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "sales return":
        case "sale return":
        case "salereturn":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "net sales":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "purchase":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "purchase return":
        case "purchasereturn":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "net purchases":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          break;
        case "receipts":
        case "metal-receipt":
          matchConditions.EntryTransactionId = { $exists: true, $ne: null };
          break;
        case "payment":
        case "payments":
        case "metal-payment":
          matchConditions.EntryTransactionId = { $exists: true, $ne: null };
          break;
        case "manufacture":
          matchConditions.description = {
            $regex: /manufacture|production|make/i,
          };
          break;
        case "transfer":
        case "transfer/adjustments":
          matchConditions.$or = [
            { TransferTransactionId: { $exists: true, $ne: null } },
            { description: { $regex: /transfer|adjustment|move/i } },
          ];
          break;
      }
    }

    // Add voucher filter
    if (filters.voucher && filters.voucher.length > 0) {
      console.log("====================================");
      console.log(filters.voucher);
      console.log("====================================");
      matchConditions.$or = filters.voucher.map((prefix) => ({
        reference: { $regex: `^${prefix}`, $options: "i" },
      }));
    }

    // Initial filtering from Registry
    pipeline.push({ $match: matchConditions });

    // Join with metaltransactions collection
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTxnInfo",
      },
    });

    // Join with entries collection
    pipeline.push({
      $lookup: {
        from: "entries",
        localField: "EntryTransactionId",
        foreignField: "_id",
        as: "entryInfo",
      },
    });

    // Join with fundtransfers collection
    pipeline.push({
      $lookup: {
        from: "fundtransfers",
        localField: "TransferTransactionId",
        foreignField: "_id",
        as: "transferInfo",
      },
    });

    // Unwind arrays
    pipeline.push({
      $unwind: { path: "$metalTxnInfo", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$entryInfo", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$transferInfo", preserveNullAndEmptyArrays: true },
    });

    pipeline.push({
      $lookup: {
        from: "accounts",
        localField: "metalTxnInfo.partyCode",
        foreignField: "_id",
        as: "metalPartyDetails",
      },
    });

    pipeline.push({
      $unwind: { path: "$metalPartyDetails", preserveNullAndEmptyArrays: true },
    });

    pipeline.push({
      $lookup: {
        from: "accounts",
        localField: "entryInfo.party",
        foreignField: "_id",
        as: "entryPartyDetails", // ✅ different alias
      },
    });
    pipeline.push({
      $unwind: { path: "$entryPartyDetails", preserveNullAndEmptyArrays: true },
    });

    // Apply specific transaction type filtering after joins
    if (filters.transactionType && filters.transactionType !== "all") {
      const transactionTypeMatch = {};

      switch (filters.transactionType.toLowerCase()) {
        case "sales":
        case "sale":
          transactionTypeMatch["metalTxnInfo.transactionType"] = "sale";
          break;
        case "sales return":
        case "sale return":
        case "salereturn":
          transactionTypeMatch["metalTxnInfo.transactionType"] = "saleReturn";
          break;
        case "net sales":
          transactionTypeMatch["metalTxnInfo.transactionType"] = {
            $in: ["sale", "saleReturn"],
          };
          break;
        case "purchase":
          transactionTypeMatch["metalTxnInfo.transactionType"] = "purchase";
          break;
        case "purchase return":
        case "purchasereturn":
          transactionTypeMatch["metalTxnInfo.transactionType"] =
            "purchaseReturn";
          break;
        case "net purchases":
          transactionTypeMatch["metalTxnInfo.transactionType"] = {
            $in: ["purchase", "purchaseReturn"],
          };
          break;
        case "receipts":
        case "metal-receipt":
          transactionTypeMatch["entryInfo.type"] = "metal-receipt";
          break;
        case "payment":
        case "payments":
        case "metal-payment":
          transactionTypeMatch["entryInfo.type"] = "metal-payment";
          break;
      }

      if (Object.keys(transactionTypeMatch).length > 0) {
        pipeline.push({ $match: transactionTypeMatch });
      }
    }

    // Add account type (party) filter
    if (filters.accountType && filters.accountType.length > 0) {
      const partyIds = filters.accountType.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      pipeline.push({
        $match: {
          $or: [
            { "metalTxnInfo.partyCode": { $in: partyIds } },
            { "entryInfo.party": { $in: partyIds } },
          ],
        },
      });
    }

    // Unwind stockItems from metal transactions
    pipeline.push({
      $unwind: {
        path: "$metalTxnInfo.stockItems",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Unwind stocks from entries
    pipeline.push({
      $unwind: {
        path: "$entryInfo.stocks",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Join with metalstocks collection
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTxnInfo.stockItems.stockCode",
        foreignField: "_id",
        as: "stockDetails",
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "entryInfo.stocks.stock",
        foreignField: "_id",
        as: "entryStockDetails",
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalId",
        foreignField: "_id",
        as: "directStockDetails",
      },
    });

    // Unwind stockDetails arrays
    pipeline.push({
      $unwind: { path: "$stockDetails", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$entryStockDetails", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: {
        path: "$directStockDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Filter by stock if provided - Fixed stock filtering
    if (filters.stock && filters.stock.length > 0) {
      const stockIds = filters.stock.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      pipeline.push({
        $match: {
          $or: [
            { "stockDetails._id": { $in: stockIds } },
            { "entryStockDetails._id": { $in: stockIds } },
            { "directStockDetails._id": { $in: stockIds } },
            { metalId: { $in: stockIds } }, // Also check direct metalId
          ],
        },
      });
    }

    // Filter by karat if provided
    if (filters.karat && filters.karat.length > 0) {
      const karatIds = filters.karat.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      pipeline.push({
        $lookup: {
          from: "karatmasters",
          localField: "stockDetails.karat",
          foreignField: "_id",
          as: "karatDetails",
        },
      });
      pipeline.push({
        $match: {
          $or: [
            { "karatDetails._id": { $in: karatIds } },
            { "entryStockDetails.karat": { $in: karatIds } },
            { "directStockDetails.karat": { $in: karatIds } },
          ],
        },
      });
      pipeline.push({
        $unwind: { path: "$karatDetails", preserveNullAndEmptyArrays: true },
      });
    }

    // Filter by division if provided
    if (filters.division && filters.division.length > 0) {
      const divisionIds = filters.division.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      pipeline.push({
        $lookup: {
          from: "divisionmasters",
          localField: "stockDetails.metalType",
          foreignField: "_id",
          as: "divisionDetails",
        },
      });
      pipeline.push({
        $match: {
          $or: [
            { "divisionDetails._id": { $in: divisionIds } },
            { "entryStockDetails.metalType": { $in: divisionIds } },
            { "directStockDetails.metalType": { $in: divisionIds } },
          ],
        },
      });
      pipeline.push({
        $unwind: { path: "$divisionDetails", preserveNullAndEmptyArrays: true },
      });
    }

    // Join with admins for salesman details
    pipeline.push({
      $lookup: {
        from: "admins",
        localField: "createdBy",
        foreignField: "_id",
        as: "salesmanDetails",
      },
    });

    // Unwind remaining lookup arrays
    pipeline.push({
      $unwind: { path: "$salesmanDetails", preserveNullAndEmptyArrays: true },
    });

    // Project required fields for response
    pipeline.push({
      $project: {
        VocDate: "$transactionDate",
        VocType: {
          $ifNull: [
            "$metalTxnInfo.voucherType",
            "$entryInfo.voucherCode",
            "$voucherType",
            "N/A",
          ],
        },
        VocNo: {
          $ifNull: ["$metalTxnInfo.voucherNumber", "$reference", "N/A"],
        },
        StockCode: {
          $ifNull: [
            "$stockDetails.code",
            "$entryStockDetails.code",
            "$directStockDetails.code",
            "N/A",
          ],
        },
        Salesman: { $ifNull: ["$salesmanDetails.name", "N/A"] },
        Account: {
          $ifNull: [
            "$metalPartyDetails.customerName",
            "$entryPartyDetails.customerName",
            "N/A",
          ],
        },
        Pcs: {
          $ifNull: [
            "$metalTxnInfo.stockItems.pieces",
            "$entryInfo.stocks.pieces",
            0,
          ],
        },
        Weight: {
          $ifNull: [
            "$grossWeight",
            "$metalTxnInfo.stockItems.grossWeight",
            "$entryInfo.totalAmount",
            0,
          ],
        },
        Rate: {
          $ifNull: ["$metalTxnInfo.stockItems.metalRateRequirements.rate", 0],
        },
        Discount: {
          $ifNull: ["$metalTxnInfo.stockItems.premium.amount", 0],
        },
        NetAmount: {
          $ifNull: [
            "$metalTxnInfo.stockItems.itemTotal.itemTotalAmount",
            "$value",
            0,
          ],
        },
      },
    });

    // Group by relevant fields to avoid duplicates
    pipeline.push({
      $group: {
        _id: {
          VocDate: "$VocDate",
          VocType: "$VocType",
          VocNo: "$VocNo",
          StockCode: "$StockCode",
          Salesman: "$Salesman",
          Account: "$Account",
        },
        Pcs: { $sum: "$Pcs" },
        Weight: { $sum: "$Weight" },
        Rate: { $first: "$Rate" },
        Discount: { $sum: "$Discount" },
        NetAmount: { $sum: "$NetAmount" },
      },
    });

    // Final projection
    pipeline.push({
      $project: {
        _id: 0,
        VocDate: "$_id.VocDate",
        VocType: "$_id.VocType",
        VocNo: "$_id.VocNo",
        StockCode: "$_id.StockCode",
        Salesman: "$_id.Salesman",
        Account: "$_id.Account",
        Pcs: "$Pcs",
        Weight: "$Weight",
        Rate: "$Rate",
        Discount: "$Discount",
        NetAmount: "$NetAmount",
      },
    });

    // Sort by VocDate and StockCode
    pipeline.push({
      $sort: {
        VocDate: -1,
        StockCode: 1,
      },
    });

    return pipeline;
  }

  buildStockMovementPipeline(filters) {
    const pipeline = [];

    // 1. Match only active + GOLD_STOCK transactions
    const matchConditions = {
      isActive: true,
      type: "GOLD_STOCK",
    };

    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    pipeline.push({ $match: matchConditions });

    // 2. Join metalInfo (inventory details)
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalId",
        foreignField: "_id",
        as: "metalInfo",
      },
    });

    // 3. Join metalTxnInfo (to support fallback)
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTxnInfo",
      },
    });

    // 4. Unwind joined arrays
    pipeline.push({
      $unwind: { path: "$metalInfo", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$metalTxnInfo", preserveNullAndEmptyArrays: true },
    });

    // 5. Filter by stockCode if provided in groupByRange
    if (filters.groupByRange?.stockCode?.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "metalInfo._id": { $in: filters.groupByRange.stockCode } },
            {
              "metalTxnInfo.stockItems.stockCode": {
                $in: filters.groupByRange.stockCode,
              },
            },
          ],
        },
      });
    }

    // 6. Filter by division if provided
    if (filters.division?.length > 0) {
      pipeline.push({
        $match: {
          "metalInfo.metalType": { $in: filters.division },
        },
      });
    }

    // 7. Filter by karat if provided in groupByRange
    if (filters.groupByRange?.karat?.length > 0) {
      pipeline.push({
        $match: {
          "metalInfo.karat": { $in: filters.groupByRange.karat },
        },
      });
    }

    // 8. Karat details (optional)
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metalInfo.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    pipeline.push({
      $unwind: { path: "$karatDetails", preserveNullAndEmptyArrays: true },
    });

    // 9. Join fallback stock detail
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTxnInfo.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    pipeline.push({
      $unwind: { path: "$metaldetail", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metalTxnInfo.karat",
        foreignField: "_id",
        as: "karat",
      },
    });

    pipeline.push({
      $unwind: { path: "$karat", preserveNullAndEmptyArrays: true },
    });

    // 10. Project clean fields with opening stock flag and debug info
    pipeline.push({
      $project: {
        grossWeight: 1,
        pureWeight: 1,
        transactionId: 1, // For debugging
        reference: 1, // For debugging
        voucherType: "$metalTxnInfo.voucherType", // For debugging
        stockId: {
          $ifNull: ["$metalInfo._id", "$metalTxnInfo.stockItems.stockCode"],
        },
        pcs: {
          $ifNull: ["$metalInfo.pcsCount", "$metalTxnInfo.stockItems.pcsCount"],
        },
        code: {
          $ifNull: ["$metalInfo.code", "$metaldetail.code"],
        },
        purity: {
          $ifNull: ["$karatDetails.standardPurity", "$metaldetail.purity"],
        },
        description: {
          $ifNull: ["$metalInfo.description", "$metaldetail.description"],
        },
        totalValue: {
          $ifNull: ["$metalInfo.totalValue", "$metaldetail.totalValue", 0],
        },
        pcs: {
          $ifNull: ["$metalInfo.pcs", "$metaldetail.pcs", false],
        },
        isOpeningStock: {
          $cond: {
            if: {
              $or: [
                { $eq: ["$reference", "OSB0001"] },
                { $eq: ["$metalTxnInfo.voucherType", "OPENING-STOCK-BALANCE"] },
                {
                  $regexMatch: {
                    input: "$description",
                    regex: "OPENING STOCK",
                    options: "i",
                  },
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    });

    // 11. Group by CODE or stockId, separating opening and total weights
    const groupId = filters.groupBy?.includes("stockCode")
      ? "$stockId"
      : "$code";

    pipeline.push({
      $group: {
        _id: groupId,
        code: { $first: "$code" },
        purity: { $first: "$purity" },
        description: { $first: "$description" },
        totalValue: { $first: "$totalValue" },
        pcs: { $first: "$pcs" },
        openingGrossWeight: {
          $sum: {
            $cond: [{ $eq: ["$isOpeningStock", true] }, "$grossWeight", 0],
          },
        },
        openingPureWeight: {
          $sum: {
            $cond: [{ $eq: ["$isOpeningStock", true] }, "$pureWeight", 0],
          },
        },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalPcs: { $sum: { $ifNull: ["$pcs", 0] } },
        transactionIds: { $push: "$transactionId" }, // For debugging
        references: { $push: "$reference" }, // For debugging
        voucherTypes: { $push: "$voucherType" }, // For debugging
      },
    });

    // 12. Lookup entry movements (payments and receipts)
    pipeline.push({
      $lookup: {
        from: "entries",
        let: {
          stockCode: filters.groupBy?.includes("stockCode") ? "$_id" : "$code",
          stockIdValue: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$type", ["metal-payment", "metal-receipt"]] },
            },
          },
          { $unwind: "$stocks" },
          {
            $lookup: {
              from: "metalstocks",
              localField: "stocks.stock",
              foreignField: "_id",
              as: "linkedStock",
            },
          },
          { $unwind: "$linkedStock" },
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$linkedStock.code", "$$stockCode"] },
                  { $eq: ["$linkedStock._id", "$$stockIdValue"] },
                ],
              },
            },
          },
          {
            $project: {
              type: 1,
              grossWeight: "$stocks.grossWeight",
              pureWeight: "$stocks.pureWeight",
            },
          },
        ],
        as: "entryMovements",
      },
    });

    // 13. Calculate payment and receipt totals
    pipeline.push({
      $addFields: {
        paymentGross: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-payment"] },
                },
              },
              as: "p",
              in: "$$p.grossWeight",
            },
          },
        },
        receiptGross: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-receipt"] },
                },
              },
              as: "r",
              in: "$$r.grossWeight",
            },
          },
        },
        paymentPure: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-payment"] },
                },
              },
              as: "p",
              in: "$$p.pureWeight",
            },
          },
        },
        receiptPure: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-receipt"] },
                },
              },
              as: "r",
              in: "$$r.pureWeight",
            },
          },
        },
      },
    });

    // 14. Final format with calculated closing balances
    pipeline.push({
      $project: {
        _id: 0,
        stockId: filters.groupBy?.includes("stockCode") ? "$_id" : null,
        code: { $ifNull: ["$code", "N/A"] },
        purity: { $ifNull: ["$purity", "N/A"] },
        description: { $ifNull: ["$description", "No Description"] },
        totalValue: { $ifNull: ["$totalValue", "No TotalValue"] },
        pcs: { $ifNull: ["$pcs", "No TotalValue"] },
        opening: {
          pcs: "$totalPcs",
          grossWeight: "$openingGrossWeight",
          pureWeight: "$openingPureWeight",
        },
        Weight: {
          pcs: "$totalPcs",
          grossWeight: "$totalGrossWeight",
          pureWeight: "$totalPureWeight",
          net: "$totalPureWeight",
        },
        payment: {
          pcs: null,
          grossWeight: { $ifNull: ["$paymentGross", 0] },
          pureWeight: { $ifNull: ["$paymentPure", 0] },
        },
        receipt: {
          pcs: null,
          grossWeight: { $ifNull: ["$receiptGross", 0] },
          pureWeight: { $ifNull: ["$receiptPure", 0] },
        },
        closing: {
          grossWeight: {
            $add: [
              "$totalGrossWeight",
              {
                $subtract: [
                  { $ifNull: ["$receiptGross", 0] },
                  { $ifNull: ["$paymentGross", 0] },
                ],
              },
            ],
          },
          pureWeight: {
            $add: [
              "$totalPureWeight",
              {
                $subtract: [
                  { $ifNull: ["$receiptPure", 0] },
                  { $ifNull: ["$paymentPure", 0] },
                ],
              },
            ],
          },
        },
        debug: {
          // For debugging
          transactionIds: "$transactionIds",
          references: "$references",
          voucherTypes: "$voucherTypes",
        },
      },
    });

    // 15. Sort by code
    pipeline.push({
      $sort: {
        code: 1,
      },
    });

    return pipeline;
  }

  buildStockPipeline(filters) {
    const pipeline = [];

    // Base filter for GOLD_STOCK registry entries
    const matchConditions = {
      isActive: true,
      type: "GOLD_STOCK",
    };

    // Add date range filter if provided
    if (filters.startDate && filters.endDate) {
      matchConditions.transactionDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    } else if (filters.startDate) {
      matchConditions.transactionDate = {
        $gte: new Date(filters.fromDate),
      };
    } else if (filters.endDate) {
      matchConditions.transactionDate = {
        $lte: new Date(filters.endDate),
      };
    }

    // Enhanced transaction type filtering
    if (filters.transactionType && filters.transactionType !== "all") {
      switch (filters.transactionType.toLowerCase()) {
        case "sales":
        case "sale":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = "sale";
          break;

        case "sales return":
        case "sale return":
        case "salereturn":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = "saleReturn";
          break;

        case "net sales":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = {
            $in: ["sale", "saleReturn"],
          };
          break;

        case "purchase":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = "purchase";
          break;

        case "purchase return":
        case "purchasereturn":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = "purchaseReturn";
          break;

        case "net purchases":
          matchConditions.metalTransactionId = { $exists: true, $ne: null };
          matchConditions["metalTxnInfo.transactionType"] = {
            $in: ["purchase", "purchaseReturn"],
          };
          break;

        case "receipts":
        case "metal-receipt":
          matchConditions.EntryTransactionId = { $exists: true, $ne: null };
          matchConditions["entryInfo.type"] = "metal-receipt";
          break;

        case "payment":
        case "payments":
        case "metal-payment":
          matchConditions.EntryTransactionId = { $exists: true, $ne: null };
          matchConditions["entryInfo.type"] = "metal-payment";
          break;

        case "manufacture":
          matchConditions.description = {
            $regex: /manufacture|production|make/i,
          };
          break;

        case "transfer":
        case "transfer/adjustments":
          matchConditions.$or = [
            { TransferTransactionId: { $exists: true, $ne: null } },
            {
              description: {
                $regex: /transfer|adjustment|move/i,
              },
            },
          ];
          break;
      }
    }
    // If transactionType is 'all' or not specified, no additional filter is applied
    // This will fetch all stock transactions regardless of type

    // Add party filter if provided
    if (filters.party && filters.party.length > 0) {
      matchConditions.party = {
        $in: filters.party.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Add cost center filter if provided
    // if (filters.costCenter) {
    //   if (Array.isArray(filters.costCenter)) {
    //     matchConditions.costCenter = { $in: filters.costCenter };
    //   } else {
    //     matchConditions.costCenter = filters.costCenter;
    //   }
    // }

    pipeline.push({ $match: matchConditions });

    // Join metalInfo (for inventory details)
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalId",
        foreignField: "_id",
        as: "metalInfo",
      },
    });

    // Join metalTxnInfo (for purchase/sale transactions)
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTxnInfo",
      },
    });

    // Join Entry info (for metal receipts/payments)
    pipeline.push({
      $lookup: {
        from: "entries",
        localField: "EntryTransactionId",
        foreignField: "_id",
        as: "entryInfo",
      },
    });

    // Unwind arrays
    pipeline.push({
      $unwind: { path: "$metalInfo", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$metalTxnInfo", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$entryInfo", preserveNullAndEmptyArrays: true },
    });

    // Unwind stockItems from metal transactions
    pipeline.push({
      $unwind: {
        path: "$metalTxnInfo.stockItems",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Unwind stocks from entries
    pipeline.push({
      $unwind: {
        path: "$entryInfo.stocks",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Join karat details for metalInfo
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metalInfo.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Join karat details for metaldetail
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metaldetail.karat",
        foreignField: "_id",
        as: "metaldetailKarat",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$metaldetailKarat",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Join karat details for entryMetalDetail
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "entryMetalDetail.karat",
        foreignField: "_id",
        as: "entryMetalKarat",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$entryMetalKarat",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Join metal stock details from transaction stockItems
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTxnInfo.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    pipeline.push({
      $unwind: { path: "$metaldetail", preserveNullAndEmptyArrays: true },
    });

    // Join metal stock details from entry stocks
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "entryInfo.stocks.stock",
        foreignField: "_id",
        as: "entryMetalDetail",
      },
    });

    pipeline.push({
      $unwind: { path: "$entryMetalDetail", preserveNullAndEmptyArrays: true },
    });

    // Apply dynamic filters based on groupByRange
    const dynamicMatchConditions = {};
    const orConditions = [];

    if (filters.groupByRange) {
      // Filter by stock codes
      if (
        filters.groupByRange.stockCode &&
        Array.isArray(filters.groupByRange.stockCode) &&
        filters.groupByRange.stockCode.length > 0
      ) {
        const stockCodes = filters.groupByRange.stockCode.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
        orConditions.push(
          { "metalInfo._id": { $in: stockCodes } },
          { "metaldetail._id": { $in: stockCodes } },
          { "entryMetalDetail._id": { $in: stockCodes } }
        );
      }

      // Filter by karat
      if (
        filters.groupByRange.karat &&
        Array.isArray(filters.groupByRange.karat) &&
        filters.groupByRange.karat.length > 0
      ) {
        const karatIds = filters.groupByRange.karat.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
        orConditions.push(
          { "metalInfo.karat": { $in: karatIds } },
          { "metaldetail.karat": { $in: karatIds } },
          { "entryMetalDetail.karat": { $in: karatIds } }
        );
      }

      // Filter by category
      if (
        filters.groupByRange.categoryCode &&
        Array.isArray(filters.groupByRange.categoryCode) &&
        filters.groupByRange.categoryCode.length > 0
      ) {
        orConditions.push(
          { "metalInfo.category": { $in: filters.groupByRange.categoryCode } },
          {
            "metaldetail.category": { $in: filters.groupByRange.categoryCode },
          },
          {
            "entryMetalDetail.category": {
              $in: filters.groupByRange.categoryCode,
            },
          }
        );
      }

      // Filter by type
      if (
        filters.groupByRange.type &&
        Array.isArray(filters.groupByRange.type) &&
        filters.groupByRange.type.length > 0
      ) {
        orConditions.push(
          { "metalInfo.type": { $in: filters.groupByRange.type } },
          { "metaldetail.type": { $in: filters.groupByRange.type } },
          { "entryMetalDetail.type": { $in: filters.groupByRange.type } }
        );
      }

      // Filter by size
      if (
        filters.groupByRange.size &&
        Array.isArray(filters.groupByRange.size) &&
        filters.groupByRange.size.length > 0
      ) {
        orConditions.push(
          { "metalInfo.size": { $in: filters.groupByRange.size } },
          { "metaldetail.size": { $in: filters.groupByRange.size } },
          { "entryMetalDetail.size": { $in: filters.groupByRange.size } }
        );
      }

      // Filter by color
      if (
        filters.groupByRange.color &&
        Array.isArray(filters.groupByRange.color) &&
        filters.groupByRange.color.length > 0
      ) {
        orConditions.push(
          { "metalInfo.color": { $in: filters.groupByRange.color } },
          { "metaldetail.color": { $in: filters.groupByRange.color } },
          { "entryMetalDetail.color": { $in: filters.groupByRange.color } }
        );
      }

      // Filter by brand
      if (
        filters.groupByRange.brand &&
        Array.isArray(filters.groupByRange.brand) &&
        filters.groupByRange.brand.length > 0
      ) {
        orConditions.push(
          { "metalInfo.brand": { $in: filters.groupByRange.brand } },
          { "metaldetail.brand": { $in: filters.groupByRange.brand } },
          { "entryMetalDetail.brand": { $in: filters.groupByRange.brand } }
        );
      }
    }

    // Filter by metal type/division
    if (
      filters.division &&
      Array.isArray(filters.division) &&
      filters.division.length > 0
    ) {
      const divisionIds = filters.division.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      orConditions.push(
        { "metalInfo.metalType": { $in: divisionIds } },
        { "metaldetail.metalType": { $in: divisionIds } },
        { "entryMetalDetail.metalType": { $in: divisionIds } }
      );
    }

    // Apply dynamic filters if any exist
    if (orConditions.length > 0) {
      dynamicMatchConditions.$or = orConditions;
      pipeline.push({ $match: dynamicMatchConditions });
    }

    // Add a stage to identify transaction type more precisely
    pipeline.push({
      $addFields: {
        transactionTypeDetailed: {
          $cond: [
            { $ifNull: ["$metalTxnInfo.transactionType", false] },
            "$metalTxnInfo.transactionType",
            {
              $cond: [
                { $ifNull: ["$entryInfo.type", false] },
                "$entryInfo.type",
                "other",
              ],
            },
          ],
        },
      },
    });

    // Apply specific transaction type filtering after joins if needed
    if (filters.transactionType && filters.transactionType !== "all") {
      const transactionTypeFilter = {};

      switch (filters.transactionType.toLowerCase()) {
        case "sales":
        case "sale":
          transactionTypeFilter.transactionTypeDetailed = "sale";
          break;
        case "sales return":
        case "sale return":
          transactionTypeFilter.transactionTypeDetailed = "saleReturn";
          break;
        case "net sales":
          transactionTypeFilter.transactionTypeDetailed = {
            $in: ["sale", "saleReturn"],
          };
          break;
        case "purchase":
          transactionTypeFilter.transactionTypeDetailed = "purchase";
          break;
        case "purchase return":
          transactionTypeFilter.transactionTypeDetailed = "purchaseReturn";
          break;
        case "net purchases":
          transactionTypeFilter.transactionTypeDetailed = {
            $in: ["purchase", "purchaseReturn"],
          };
          break;
        case "receipts":
        case "metal-receipt":
          transactionTypeFilter.transactionTypeDetailed = "metal-receipt";
          break;
        case "payment":
        case "payments":
        case "metal-payment":
          transactionTypeFilter.transactionTypeDetailed = "metal-payment";
          break;
      }

      if (Object.keys(transactionTypeFilter).length > 0) {
        pipeline.push({ $match: transactionTypeFilter });
      }
    }
    // Project merged structure with data from all sources
    pipeline.push({
      $project: {
        _id: 1,
        transactionId: 1,
        transactionDate: 1,
        type: 1,
        description: 1,
        transactionTypeDetailed: 1,
        debit: 1,
        credit: 1,
        grossWeight: {
          $ifNull: [
            "$grossWeight",
            "$metalTxnInfo.stockItems.grossWeight",
            "$entryInfo.stocks.grossWeight",
            0,
          ],
        },
        pureWeight: {
          $ifNull: [
            "$pureWeight",
            "$metalTxnInfo.stockItems.pureWeight",
            "$entryInfo.stocks.netWeight",
            0,
          ],
        },
        // Enhanced PCS calculation logic
        pcs: {
          $cond: [
            { $ifNull: ["$metalInfo.pcs", false] },
            {
              $ifNull: [
                "$metalInfo.pcsCount",
                "$metalTxnInfo.stockItems.pieces",
                "$metaldetail.pcsCount",
                "$entryMetalDetail.pcsCount",
                0,
              ],
            },
            {
              $cond: [
                { $ifNull: ["$metaldetail.pcs", false] },
                {
                  $ifNull: [
                    "$metaldetail.pcsCount",
                    "$metalTxnInfo.stockItems.pieces",
                    0,
                  ],
                },
                {
                  $cond: [
                    { $ifNull: ["$entryMetalDetail.pcs", false] },
                    {
                      $ifNull: ["$entryMetalDetail.pcsCount", 0],
                    },
                    0,
                  ],
                },
              ],
            },
          ],
        },
        // Add calculated stock PCS based on your logic: totalGrossWeight / totalValue
        calculatedStockPcs: {
          $let: {
            vars: {
              isPcsStock: {
                $or: [
                  { $ifNull: ["$metalInfo.pcs", false] },
                  { $ifNull: ["$metaldetail.pcs", false] },
                  { $ifNull: ["$entryMetalDetail.pcs", false] },
                ],
              },
              totalValue: {
                $ifNull: [
                  "$metalInfo.totalValue",
                  "$metaldetail.totalValue",
                  "$entryMetalDetail.totalValue",
                  0,
                ],
              },
              grossWeight: {
                $ifNull: [
                  "$grossWeight",
                  "$metalTxnInfo.stockItems.grossWeight",
                  "$entryInfo.stocks.grossWeight",
                  0,
                ],
              },
            },
            in: {
              $cond: [
                { $and: ["$$isPcsStock", { $gt: ["$$totalValue", 0] }] },
                { $divide: ["$$grossWeight", "$$totalValue"] },
                0,
              ],
            },
          },
        },
        // Include stock metadata for PCS calculation
        isPcsStock: {
          $or: [
            { $ifNull: ["$metalInfo.pcs", false] },
            { $ifNull: ["$metaldetail.pcs", false] },
            { $ifNull: ["$entryMetalDetail.pcs", false] },
          ],
        },
        stockTotalValue: {
          $ifNull: [
            "$metalInfo.totalValue",
            "$metaldetail.totalValue",
            "$entryMetalDetail.totalValue",
            0,
          ],
        },
        stockPcsCount: {
          $ifNull: [
            "$metalInfo.pcsCount",
            "$metaldetail.pcsCount",
            "$entryMetalDetail.pcsCount",
            0,
          ],
        },
        code: {
          $ifNull: [
            "$metalInfo.code",
            "$metaldetail.code",
            "$entryMetalDetail.code",
            "N/A",
          ],
        },
        stockDescription: {
          $ifNull: [
            "$metalInfo.description",
            "$metaldetail.description",
            "$entryMetalDetail.description",
            "N/A",
          ],
        },
        metalType: {
          $ifNull: [
            "$metalInfo.metalType",
            "$metaldetail.metalType",
            "$entryMetalDetail.metalType",
            "N/A",
          ],
        },
        karat: {
          $ifNull: [
            "$karatDetails.karat",
            "$metaldetailKarat.karat",
            "$entryMetalKarat.karat",
            "N/A",
          ],
        },
        purity: {
          $ifNull: [
            "$karatDetails.standardPurity",
            "$metaldetailKarat.standardPurity",
            "$entryMetalKarat.standardPurity",
            "$purity",
            "$metalTxnInfo.stockItems.purity",
            "$entryInfo.stocks.purity",
            "$metalInfo.purity",
            0,
          ],
        },
        // Transaction source identification
        source: {
          $cond: [
            { $ifNull: ["$metalTransactionId", false] },
            "metal_transaction",
            {
              $cond: [
                { $ifNull: ["$EntryTransactionId", false] },
                "entry",
                {
                  $cond: [
                    { $ifNull: ["$TransferTransactionId", false] },
                    "transfer",
                    "direct",
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    // return pipeline

    // Group by code and description to get totals
    pipeline.push({
      $group: {
        _id: {
          code: "$code",
          stockDescription: "$stockDescription",
          metalType: "$metalType",
          karat: "$karat",
          purity: "$purity",
          isPcsStock: "$isPcsStock",
        },
        totalCredit: { $sum: "$credit" },
        totalDebit: { $sum: "$debit" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalPcs: { $sum: "$pcs" },
        totalCalculatedStockPcs: { $sum: "$calculatedStockPcs" },
        stockTotalValue: { $first: "$stockTotalValue" },
        stockPcsCount: { $first: "$stockPcsCount" },
        transactions: { $push: "$$ROOT" },
        transactionCount: { $sum: 1 },
        transactionTypes: { $addToSet: "$transactionTypeDetailed" },
      },
    });

    // Add this stage next:
    pipeline.push({
      $addFields: {
        totalGrossWeight: {
          $subtract: ["$totalDebit", "$totalCredit"],
        },
      },
    });

    // Add conditional calculations for net values
    pipeline.push({
      $addFields: {
        // Net calculations for sales
        netSalesWeight: {
          $cond: [
            { $eq: [filters.transactionType, "net sales"] },
            {
              $subtract: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$transactions",
                          cond: {
                            $eq: ["$$this.transactionTypeDetailed", "sale"],
                          },
                        },
                      },
                      as: "txn",
                      in: "$$txn.grossWeight",
                    },
                  },
                },
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$transactions",
                          cond: {
                            $eq: [
                              "$$this.transactionTypeDetailed",
                              "saleReturn",
                            ],
                          },
                        },
                      },
                      as: "txn",
                      in: "$$txn.grossWeight",
                    },
                  },
                },
              ],
            },
            "$totalGrossWeight",
          ],
        },
        // Net calculations for purchases
        netPurchaseWeight: {
          $cond: [
            { $eq: [filters.transactionType, "net purchases"] },
            {
              $subtract: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$transactions",
                          cond: {
                            $eq: ["$$this.transactionTypeDetailed", "purchase"],
                          },
                        },
                      },
                      as: "txn",
                      in: "$$txn.grossWeight",
                    },
                  },
                },
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$transactions",
                          cond: {
                            $eq: [
                              "$$this.transactionTypeDetailed",
                              "purchaseReturn",
                            ],
                          },
                        },
                      },
                      as: "txn",
                      in: "$$txn.grossWeight",
                    },
                  },
                },
              ],
            },
            "$totalGrossWeight",
          ],
        },
      },
    });

    // Final projection with renamed fields
    pipeline.push({
      $project: {
        _id: 0,
        code: "$_id.code",
        description: "$_id.stockDescription",
        metalType: "$_id.metalType",
        karat: "$_id.karat",
        purity: { $round: ["$_id.purity", 3] },
        isPcsStock: "$_id.isPcsStock",
        stockPcsCount: "$stockPcsCount",
        stockTotalValue: "$stockTotalValue",
        test: "",
        totalGrossWeight: {
          $round: [
            {
              $cond: [
                { $eq: [filters.transactionType, "net sales"] },
                "$netSalesWeight",
                {
                  $cond: [
                    { $eq: [filters.transactionType, "net purchases"] },
                    "$netPurchaseWeight",
                    "$totalGrossWeight",
                  ],
                },
              ],
            },
            3,
          ],
        },
        totalPureWeight: { $round: ["$totalPureWeight", 3] },
        totalGrsWt: { $round: ["$totalPureWeight", 3] },
        totalPcs: "$totalPcs",
        // Calculate final stock PCS: totalGrossWeight / stockTotalValue (for PCS stocks only)
        totalStockPcs: {
          $cond: [
            { $and: ["$_id.isPcsStock", { $gt: ["$stockTotalValue", 0] }] },
            {
              $round: [
                { $divide: ["$totalGrossWeight", "$stockTotalValue"] },
                3,
              ],
            },
            0,
          ],
        },
        totalCalculatedStockPcs: { $round: ["$totalCalculatedStockPcs", 3] },
        totalDebit: { $round: ["$totalDebit", 2] },
        totalCredit: { $round: ["$totalCredit", 2] },
        netBalance: {
          $round: [{ $subtract: ["$totalCredit", "$totalDebit"] }, 2],
        },
        transactionCount: "$transactionCount",
        transactionTypes: "$transactionTypes",
        // Include transaction details if needed for debugging
        ...(filters.includeTransactionDetails && {
          transactions: "$transactions",
        }),
      },
    });

    // Sort by code
    pipeline.push({
      $sort: { code: 1, description: 1 },
    });

    return pipeline;
  }

  buildTransactionSummaryPipeline(filters) {
    const pipeline = [];

    // Step 1: Base match condition
    const matchConditions = {
      isActive: true,
    };

    // Step 2: Add date filters if present
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }
    if (filters.voucher && filters.voucher.length > 0) {
      matchConditions.reference = {
        $regex: `^(${filters.voucher.join("|")})`, // Starts with any value in the array
        $options: "i", // case-insensitive (optional)
      };
    }

    // Step 3: Include documents where at least one type of transaction exists
    matchConditions.$or = [
      { metalTransactionId: { $exists: true, $ne: null } },
      { EntryTransactionId: { $exists: true, $ne: null } },
      { TransferTransactionId: { $exists: true, $ne: null } },
    ];

    // Step 4: Apply the match
    pipeline.push({ $match: matchConditions });
    // Step 5: Lookup related collections

    // 5a: Lookup metalTransaction data
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metaltransactions",
      },
    });

    // 5b: Lookup entries (e.g., purchase or manual entry records)
    pipeline.push({
      $lookup: {
        from: "entries",
        localField: "EntryTransactionId",
        foreignField: "_id",
        as: "entries",
      },
    });

    // 5c: Lookup fund transfers
    pipeline.push({
      $lookup: {
        from: "fundtransfers",
        localField: "TransferTransactionId",
        foreignField: "_id",
        as: "fundtransfers",
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metaltransactions.stockItems.stockCode",
        foreignField: "_id",
        as: "MetalTransactionMetalStock",
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "entries.stocks.stock",
        foreignField: "_id",
        as: "entriesMetalStock",
      },
    });

    // Step 6: Unwind joined data (preserve null for optional relationships)
    pipeline.push({
      $unwind: { path: "$metaltransactions", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$entries", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$fundtransfers", preserveNullAndEmptyArrays: true },
    });

    // Step 7: Filter by transactionType if provided
    if (filters.transactionType && filters.transactionType !== "all") {
      pipeline.push({
        $match: {
          "metaltransactions.transactionType": filters.transactionType,
        },
      });
    }

    if (filters.groupByRange?.stockCode?.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "entries.stocks.stock": { $in: filters.groupByRange.stockCode } },
            {
              "metaltransactions.stockItems.stockCode": {
                $in: filters.groupByRange.stockCode,
              },
            },
          ],
        },
      });
    }

    if (filters.groupByRange?.karat?.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "metalInfo._id": { $in: filters.groupByRange.stockCode } },
            {
              "metalTxnInfo.stockItems.stockCode": {
                $in: filters.groupByRange.stockCode,
              },
            },
          ],
        },
      });
    }

    // Step 8: Unwind stockItems from metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions.stockItems",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 9: Lookup metalstocks for stock details
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metaltransactions.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    // Step 10: Unwind metaldetail
    pipeline.push({
      $unwind: {
        path: "$metaldetail",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 11: Lookup karat details (optional, as purity is available in stockItems)
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metaldetail.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    // Step 12: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalratemasters",
        localField: "metaltransactions.stockItems.metalRate",
        foreignField: "_id",
        as: "metalRate",
      },
    });

    // Step 12: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$metalRate",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 13: Project the required fields
    pipeline.push({
      $project: {
        transactionId: "$transactionId",
        reference: "$reference",
        description: "$description",
        pcs: { $ifNull: ["$metaltransactions.stockItems.pieces", 0] },
        grossWeight: {
          $ifNull: [
            "$grossWeight",
            "$metaltransactions.stockItems.grossWeight",
            0,
          ],
        },
        premium: {
          $ifNull: ["$metaltransactions.stockItems.premium.amount", 0],
        },
        makingCharge: {
          $ifNull: ["$metaltransactions.stockItems.makingCharges.amount", 0],
        },
        discount: { $literal: 0 }, // Explicitly set to 0 using $literal
        purity: {
          $ifNull: ["$purity", "$metaltransactions.stockItems.purity", 0],
        },
        pureWeight: {
          $ifNull: [
            "$pureWeight",
            "$metaltransactions.stockItems.pureWeight",
            0,
          ],
        },
        totalAmount: {
          $ifNull: [
            "$metaltransactions.totalAmountSession.totalAmountAED",
            "$entries.totalAmount",
            0,
          ],
        },
        metalValue: {
          $ifNull: [
            "$metaltransactions.stockItems.metalRateRequirements.rate",
            0,
          ],
        },
        _id: 0,
      },
    });

    if (filters.costFilter?.minAmount) {
      pipeline.push({
        $match: {
          totalAmount: { $gte: filters.costFilter.minAmount },
        },
      });
    }

    // Step 14: Group to calculate totals
    pipeline.push({
      $group: {
        _id: null,
        transactions: {
          $push: {
            transactionId: "$transactionId",
            reference: "$reference",
            description: "$description",
            pcs: "$pcs",
            grossWeight: "$grossWeight",
            premium: "$premium",
            discount: "$discount",
            purity: "$purity",
            pureWeight: "$pureWeight",
            metalValue: "$metalValue",
            makingCharge: "$makingCharge",
            total: "$totalAmount",
          },
        },
        totalPcs: { $sum: "$pcs" },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPremium: { $sum: "$premium" },
        totalDiscount: { $sum: "$discount" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalMetalValue: { $sum: "$metalValue" },
        totalMakingCharge: { $sum: "$makingCharge" },
      },
    });

    // Step 15: Project the final output
    pipeline.push({
      $project: {
        _id: 0,
        transactions: 1,
        totals: {
          totalPcs: "$totalPcs",
          totalGrossWeight: "$totalGrossWeight",
          totalPremium: "$totalPremium",
          totalDiscount: "$totalDiscount",
          totalPureWeight: "$totalPureWeight",
          totalMetalValue: "$totalMetalValue",
          totalMakingCharge: "$totalMakingCharge",
        },
      },
    });

    return pipeline;

    // Dynamically add conditions based on non-empty arrays
    if (filters.groupByRange?.stockCode?.length > 0) {
      groupByMatch["metalInfo.code"] = { $in: filters.groupByRange.stockCode };
    }

    if (filters.groupByRange?.categoryCode?.length > 0) {
      groupByMatch["metalInfo.category"] = {
        $in: filters.groupByRange.categoryCode,
      };
    }

    if (filters.groupByRange?.karat?.length > 0) {
      groupByMatch["metalInfo.karat"] = { $in: filters.groupByRange.karat };
    }

    if (filters.groupByRange?.type?.length > 0) {
      groupByMatch["metalInfo.type"] = { $in: filters.groupByRange.type };
    }

    if (filters.groupByRange?.size?.length > 0) {
      groupByMatch["metalInfo.size"] = { $in: filters.groupByRange.size };
    }

    if (filters.groupByRange?.color?.length > 0) {
      groupByMatch["metalInfo.color"] = { $in: filters.groupByRange.color };
    }

    if (filters.groupByRange?.brand?.length > 0) {
      groupByMatch["metalInfo.brand"] = { $in: filters.groupByRange.brand };
    }

    // Only push $match if any filter was added
    if (Object.keys(groupByMatch).length > 0) {
      pipeline.push({ $match: groupByMatch });
    }
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metalInfo.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    pipeline.push({
      $group: {
        _id: {
          metalId: "$metalId",
          code: "$metalInfo.code",
          description: "$metalInfo.description",
          metalType: "$metalInfo.metalType",
          purity: "$purity",
        },
        metalName: { $first: "$metalInfo.code" },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPureWeight: { $sum: "$pureWeight" },

        totalCredit: { $sum: "$credit" },
        totalDebit: { $sum: "$debit" },

        // Smart pcsCount computation
        totalPcsCount: {
          $sum: {
            $cond: [
              { $eq: ["$metalInfo.pcs", true] },
              {
                $round: [
                  { $divide: ["$grossWeight", "$metalInfo.totalValue"] },
                  0,
                ],
              },
              0,
            ],
          },
        },
        logs: { $push: "$$ROOT" },
      },
    });

    // Conditionally filter based on transactionType
    if (filters.transactionType) {
      pipeline.push({
        $project: {
          metalId: "$_id.metalId",
          code: "$_id.code",
          description: "$_id.description",
          metalType: "$_id.metalType",
          purity: "$_id.purity",
          totalPcsCount: 1,
          totalGrossWeight: 1,
          totalPureWeight: 1,
          totalValue: 1,
          _id: 0,
        },
      });
    }
    return pipeline;
  }

  OwnStockPipeLine(filters) {
    const pipeline = [];

    // Step 3: Date filtering (optional, based on filters)
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    // Step 1: Define match conditions for specific reference prefixes
    const referenceRegex = [
      { reference: { $regex: "^PR\\d+", $options: "i" } }, // Purchase Return
      { reference: { $regex: "^PF", $options: "i" } }, // Purchase Fixing
      { reference: { $regex: "^SR", $options: "i" } }, // Sales Return
      { reference: { $regex: "^SF", $options: "i" } }, // Sales Fixing
      { reference: { $regex: "^OSB", $options: "i" } }, // Opening Balance
      { reference: { $regex: "^PRM\\d+", $options: "i" } }, // Purchase Metal (fixing only)
      { reference: { $regex: "^SAL\\d+", $options: "i" } }, // Sale Metal (fixing only)
    ];

    // Step 2: Build match conditions with fallback for missing reference
    const matchConditions = {
      isActive: true,
      $or: [
        ...referenceRegex,
        { reference: { $exists: false } }, // Include documents with no reference (optional)
      ],
    };

    // Step 4: Push $match to pipeline
    pipeline.push({ $match: matchConditions });

    /* ------------------------------------------
       Step 5: Lookup related collections
    ------------------------------------------ */

    // metaltransactions
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metaltransactions",
      },
    });

    // entries
    pipeline.push({
      $lookup: {
        from: "entries",
        localField: "EntryTransactionId",
        foreignField: "_id",
        as: "entries",
      },
    });

    // metalstocks
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalId",
        foreignField: "_id",
        as: "metalstocks",
      },
    });

    /* ------------------------------------------
       Step 6: Unwind joined data (safe unwind)
    ------------------------------------------ */
    pipeline.push({
      $unwind: { path: "$metaltransactions", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$entries", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: "$metalstocks", preserveNullAndEmptyArrays: true },
    });

    /* ------------------------------------------
       Step 7: Filter metaltransactions for fixed: true for PRM and SAL
    ------------------------------------------ */
    // pipeline.push({
    //   $match: {
    //     $or: [
    //       { reference: { $not: { $regex: "^(PRM|SAL|PR|SR)\\d+", $options: "i" } } }, // Keep all non-PRM/SAL
    //       {
    //         $and: [
    //           { reference: { $regex: "^(PRM|SAL|SR|PR)\\d+", $options: "i" } }, // Match PRM or SAL
    //           { "metaltransactions.fixed": true } // Only include if fixed is true
    //         ]
    //       }
    //     ]
    //   }
    // });

    /* ------------------------------------------
       Step 8: Sort by transactionDate to ensure consistent $first selection (optional)
    ------------------------------------------ */
    pipeline.push({ $sort: { transactionDate: 1 } }); // Sort ascending to get the earliest entry

    /* ------------------------------------------
       Step 9: First Group by full reference to take first value per unique voucher
    ------------------------------------------ */
    pipeline.push({
      $group: {
        _id: "$reference", // Group by full reference (e.g., PF0006, PR0001) to consolidate voucher entries
        totalValue: { $first: { $ifNull: ["$value", 0] } }, // Take the first value for this voucher
        totalGrossWeight: { $first: { $ifNull: ["$grossWeight", 0] } }, // Take the first gross weight
        totalDebit: { $first: { $ifNull: ["$debit", 0] } }, // Take the first debit
        totalCredit: { $first: { $ifNull: ["$credit", 0] } }, // Take the first credit
        transactionCount: { $sum: 1 }, // Count of registry entries per voucher
        latestTransactionDate: { $max: "$transactionDate" }, // Latest date for this voucher
      },
    });

    /* ------------------------------------------
       Step 10: Second Group by prefix to sum across unique vouchers
    ------------------------------------------ */
    pipeline.push({
      $group: {
        _id: {
          $let: {
            vars: {
              prefix: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^PR\d+/i,
                        },
                      },
                      then: "PR",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^PF/i,
                        },
                      },
                      then: "PF",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^SR/i,
                        },
                      },
                      then: "SR",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^SF/i,
                        },
                      },
                      then: "SF",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^OSB/i,
                        },
                      },
                      then: "OSB",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^PRM\d+/i,
                        },
                      },
                      then: "PRM",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$_id", ""] },
                          regex: /^SAL\d+/i,
                        },
                      },
                      then: "SAL",
                    },
                  ],
                  default: "UNKNOWN",
                },
              },
            },
            in: "$$prefix",
          },
        },
        totalValue: { $sum: "$totalValue" }, // Sum the first values across unique vouchers (e.g., PF0006 + PF0007)
        totalGrossWeight: { $sum: "$totalGrossWeight" }, // Sum the first gross weights
        totalDebit: { $sum: "$totalDebit" }, // Sum the first debits
        totalCredit: { $sum: "$totalCredit" }, // Sum the first credits
        transactionCount: { $sum: "$transactionCount" }, // Total count of registry entries across vouchers
        latestTransactionDate: { $max: "$latestTransactionDate" }, // Latest date across vouchers
      },
    });

    /* ------------------------------------------
       Step 11: Project to format the output
    ------------------------------------------ */
    pipeline.push({
      $project: {
        _id: 0,
        category: "$_id",
        description: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", "OSB"] }, then: "Opening Balance" },
              { case: { $eq: ["$_id", "PF"] }, then: "Purchase Fixing" },
              { case: { $eq: ["$_id", "SF"] }, then: "Sales Fixing" },
              { case: { $eq: ["$_id", "PR"] }, then: "Purchase Return" },
              { case: { $eq: ["$_id", "SR"] }, then: "Sales Return" },
              { case: { $eq: ["$_id", "PRM"] }, then: "Purchase" },
              { case: { $eq: ["$_id", "SAL"] }, then: "Sales" },
              { case: { $eq: ["$_id", "UNKNOWN"] }, then: "Unknown Category" },
            ],
            default: "Unknown Category",
          },
        },
        totalValue: 1,
        netGrossWeight: { $subtract: ["$totalDebit", "$totalCredit"] },
        totalGrossWeight: 1,
        transactionCount: 1,
        latestTransactionDate: 1,
      },
    });

    /* ------------------------------------------
       Step 12: Sort by category
    ------------------------------------------ */
    pipeline.push({
      $sort: { category: 1 }, // Sort alphabetically by category
    });

    return pipeline;

    // Step 7: Filter by transactionType if provided
    if (filters.transactionType && filters.transactionType !== "all") {
      pipeline.push({
        $match: {
          "metaltransactions.transactionType": filters.transactionType,
        },
      });
    }

    if (filters.groupByRange?.stockCode?.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "entries.stocks.stock": { $in: filters.groupByRange.stockCode } },
            {
              "metaltransactions.stockItems.stockCode": {
                $in: filters.groupByRange.stockCode,
              },
            },
          ],
        },
      });
    }

    if (filters.groupByRange?.karat?.length > 0) {
      pipeline.push({
        $match: {
          $or: [
            { "metalInfo._id": { $in: filters.groupByRange.stockCode } },
            {
              "metalTxnInfo.stockItems.stockCode": {
                $in: filters.groupByRange.stockCode,
              },
            },
          ],
        },
      });
    }

    // Step 8: Unwind stockItems from metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions.stockItems",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 9: Lookup metalstocks for stock details
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metaltransactions.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    // Step 10: Unwind metaldetail
    pipeline.push({
      $unwind: {
        path: "$metaldetail",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 11: Lookup karat details (optional, as purity is available in stockItems)
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metaldetail.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    // Step 12: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    pipeline.push({
      $lookup: {
        from: "metalratemasters",
        localField: "metaltransactions.stockItems.metalRate",
        foreignField: "_id",
        as: "metalRate",
      },
    });

    // Step 12: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$metalRate",
        preserveNullAndEmptyArrays: true,
      },
    });

    return pipeline;

    // Step 13: Project the required fields
    pipeline.push({
      $project: {
        transactionId: "$transactionId",
        description: "$description",
        pcs: { $ifNull: ["$metaltransactions.stockItems.pieces", 0] },
        grossWeight: {
          $ifNull: [
            "$grossWeight",
            "$metaltransactions.stockItems.grossWeight",
            0,
          ],
        },
        premium: {
          $ifNull: ["$metaltransactions.stockItems.premium.amount", 0],
        },
        makingCharge: {
          $ifNull: ["$metaltransactions.stockItems.makingCharges.amount", 0],
        },
        discount: { $literal: 0 }, // Explicitly set to 0 using $literal
        purity: {
          $ifNull: ["$purity", "$metaltransactions.stockItems.purity", 0],
        },
        pureWeight: {
          $ifNull: [
            "$pureWeight",
            "$metaltransactions.stockItems.pureWeight",
            0,
          ],
        },
        totalAmount: {
          $ifNull: [
            "$metaltransactions.totalAmountSession.totalAmountAED",
            "$entries.totalAmount",
            0,
          ],
        },
        metalValue: {
          $ifNull: [
            "$metaltransactions.stockItems.metalRateRequirements.rate",
            0,
          ],
        },
        _id: 0,
      },
    });

    // Step 14: Group to calculate totals
    pipeline.push({
      $group: {
        _id: null,
        transactions: {
          $push: {
            transactionId: "$transactionId",
            description: "$description",
            pcs: "$pcs",
            grossWeight: "$grossWeight",
            premium: "$premium",
            discount: "$discount",
            purity: "$purity",
            pureWeight: "$pureWeight",
            metalValue: "$metalValue",
            makingCharge: "$makingCharge",
            total: "$totalAmount",
          },
        },
        totalPcs: { $sum: "$pcs" },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPremium: { $sum: "$premium" },
        totalDiscount: { $sum: "$discount" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalMetalValue: { $sum: "$metalValue" },
        totalMakingCharge: { $sum: "$makingCharge" },
      },
    });

    // Step 15: Project the final output
    pipeline.push({
      $project: {
        _id: 0,
        transactions: 1,
        totals: {
          totalPcs: "$totalPcs",
          totalGrossWeight: "$totalGrossWeight",
          totalPremium: "$totalPremium",
          totalDiscount: "$totalDiscount",
          totalPureWeight: "$totalPureWeight",
          totalMetalValue: "$totalMetalValue",
          totalMakingCharge: "$totalMakingCharge",
        },
      },
    });

    return pipeline;

    // Dynamically add conditions based on non-empty arrays
    if (filters.groupByRange?.stockCode?.length > 0) {
      groupByMatch["metalInfo.code"] = { $in: filters.groupByRange.stockCode };
    }

    if (filters.groupByRange?.categoryCode?.length > 0) {
      groupByMatch["metalInfo.category"] = {
        $in: filters.groupByRange.categoryCode,
      };
    }

    if (filters.groupByRange?.karat?.length > 0) {
      groupByMatch["metalInfo.karat"] = { $in: filters.groupByRange.karat };
    }

    if (filters.groupByRange?.type?.length > 0) {
      groupByMatch["metalInfo.type"] = { $in: filters.groupByRange.type };
    }

    if (filters.groupByRange?.size?.length > 0) {
      groupByMatch["metalInfo.size"] = { $in: filters.groupByRange.size };
    }

    if (filters.groupByRange?.color?.length > 0) {
      groupByMatch["metalInfo.color"] = { $in: filters.groupByRange.color };
    }

    if (filters.groupByRange?.brand?.length > 0) {
      groupByMatch["metalInfo.brand"] = { $in: filters.groupByRange.brand };
    }

    // Only push $match if any filter was added
    if (Object.keys(groupByMatch).length > 0) {
      pipeline.push({ $match: groupByMatch });
    }
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metalInfo.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    pipeline.push({
      $group: {
        _id: {
          metalId: "$metalId",
          code: "$metalInfo.code",
          description: "$metalInfo.description",
          metalType: "$metalInfo.metalType",
          purity: "$purity",
        },
        metalName: { $first: "$metalInfo.code" },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPureWeight: { $sum: "$pureWeight" },

        totalCredit: { $sum: "$credit" },
        totalDebit: { $sum: "$debit" },

        // Smart pcsCount computation
        totalPcsCount: {
          $sum: {
            $cond: [
              { $eq: ["$metalInfo.pcs", true] },
              {
                $round: [
                  { $divide: ["$grossWeight", "$metalInfo.totalValue"] },
                  0,
                ],
              },
              0,
            ],
          },
        },
        logs: { $push: "$$ROOT" },
      },
    });

    // Conditionally filter based on transactionType
    if (filters.transactionType) {
      pipeline.push({
        $project: {
          metalId: "$_id.metalId",
          code: "$_id.code",
          description: "$_id.description",
          metalType: "$_id.metalType",
          purity: "$_id.purity",
          totalPcsCount: 1,
          totalGrossWeight: 1,
          totalPureWeight: 1,
          totalValue: 1,
          _id: 0,
        },
      });
    }
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
        stock: item.stockCode || "N/A",
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
      dateRange:
        filters.startDate && filters.endDate
          ? `${moment(filters.startDate).format("DD/MM/YYYY")} to ${moment(
              filters.endDate
            ).format("DD/MM/YYYY")}`
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
