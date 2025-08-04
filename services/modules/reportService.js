import mongoose from "mongoose";
import Registry from "../../models/modules/Registry.js";

import moment from "moment";
import { log } from "console";
import Inventory from "../../models/modules/inventory.js";
import Account from "../../models/modules/AccountType.js";
import InventoryLog from "../../models/modules/InventoryLog.js";
const { ObjectId } = mongoose.Types;
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

      // Execute aggregation query for taking sales and purchase
      const salesPipeline = this.buildSalesAnalysis(validatedFilters);
      const purchasePipeline = this.buildSalesAnalysisPurchase();

      // Execute aggregation query
      const salesReport = await Registry.aggregate(salesPipeline).exec();
      const purchaseReport = await Registry.aggregate(purchasePipeline).exec();
      

      // Calculate sales analysis
      const reportData = this.calculateSalesAnalysis(salesReport, purchaseReport);

      return {
        success: true,
        message: "Sales analysis report generated successfully",
        data: reportData,
        totalRecords: reportData.transactions ? reportData.transactions.length : 0,
      };
    } catch (error) {
      throw new Error(`Failed to generate sales analysis report: ${error.message}`);
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
      const reportData = await InventoryLog.aggregate(pipeline);

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
      const reportData = await InventoryLog.aggregate(pipeline);

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
      // 1. Validate and normalize filters
      const validatedFilters = this.validateFilters(filters);

      // 2. Construct aggregation pipelines
      const stockPipeline = this.OwnStockPipeLine(validatedFilters);
      const receivablesPayablesPipeline = this.getReceivablesAndPayables();

      // 3. Run both aggregations in parallel

      const receivablesAndPayables = await Account.aggregate(receivablesPayablesPipeline)
      const reportData = await Registry.aggregate(stockPipeline)

      const finilized = this.formatedOwnStock(reportData, receivablesAndPayables)

      // 5. Return structured response
      return {
        success: true,
        data: reportData,
      };

    } catch (error) {
      console.error("Error generating stock report:", error);
      throw new Error(
        `Failed to generate metal stock ledger report: ${error.message}`
      );
    }
  }



  async getMetalFixingReports(filters) {
    try {

      // Validate and format input filters
      const validatedFilters = this.validateFilters(filters);

      // Construct MongoDB aggregation pipeline
      const pipeline = this.metalFxingPipeLine(validatedFilters);

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


  validateFilters(filters = {}, isStock = false) {
    // Provide default empty object if filters is undefined or null
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

    // Conditionally add groupByRange if it has any non-empty array
    const hasGroupByRangeValues = Object.values(groupByRange).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );

    if (isStock) {
      if (hasGroupByRangeValues) {
        const formattedGroupByRange = {};
        for (const [key, value] of Object.entries(groupByRange)) {
          if (["karat", "categoryCode", "supplier", "type", "brand"].includes(key)) {
            formattedGroupByRange[key] = formatObjectIds(value);
          } else {
            formattedGroupByRange[key] = value;
          }
        }
        result.groupByRange = formattedGroupByRange;
      }
    } else {
      if (hasGroupByRangeValues) {
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

    // Convert and normalize using moment
    const startDate = moment(filters.fromDate).startOf("day").toDate(); // 00:00:00
    const endDate = moment(filters.toDate).endOf("day").toDate();       // 23:59:59.999

    // Validate range
    if (startDate > endDate) {
      throw new Error("From date cannot be greater than to date");
    }

    return {
      ...filters,
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
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
      $or: [
        { metalTransactionId: { $exists: true, $ne: null } },
        { EntryTransactionId: { $exists: true, $ne: null } },
      ],
    };

    // Type filter
    if (filters.type) {
      matchConditions.type = filters.type;
    }

    if (filters.voucher && filters.voucher.length > 0) {
      const regexFilters = filters.voucher.map((prefix) => ({
        reference: { $regex: `^${prefix}\\d+$`, $options: "i" }
      }));

      pipeline.push({
        $match: {
          $or: regexFilters
        }
      });
    }

    // Date filter
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    // Stage 1: Match base records
    pipeline.push({ $match: matchConditions });

    // Stage 2: Lookup metalTransaction
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTransaction",
      },
    });

    // Stage 3: Lookup entryInfo
    pipeline.push({
      $lookup: {
        from: "entries",
        localField: "EntryTransactionId",
        foreignField: "_id",
        as: "entryInfo",
      },
    });

    // Stage 4: Unwind
    pipeline.push(
      { $unwind: { path: "$metalTransaction", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$entryInfo", preserveNullAndEmptyArrays: true } }
    );

    // Stage 5: Normalize data into transactionData, partyCode, etc.
    pipeline.push({
      $addFields: {
        transactionData: {
          $cond: [{ $ifNull: ["$metalTransaction", false] }, "$metalTransaction", "$entryInfo"]
        },
        partyCode: {
          $ifNull: ["$metalTransaction.partyCode", "$entryInfo.party"]
        },
        voucher: {
          $cond: [
            { $ifNull: ["$metalTransaction", false] },
            "$metalTransaction.voucherNumber",
            "$entryInfo.voucherCode"
          ]
        }
      }
    });

    // Stage 6: Fallback stockItems (from entry `stocks`)
    pipeline.push({
      $addFields: {
        "transactionData.stockItems": {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$transactionData.stockItems", []] } }, 0] },
            "$transactionData.stockItems",
            "$transactionData.stocks"
          ]
        }
      }
    });

    // Stage 7: Lookup account info
    pipeline.push({
      $lookup: {
        from: "accounts",
        localField: "partyCode",
        foreignField: "_id",
        as: "partyAccount"
      }
    });

    // Stage 8: Set partyName from account, fallback to "N/A"
    pipeline.push({
      $addFields: {
        partyName: {
          $ifNull: [{ $arrayElemAt: ["$partyAccount.customerName", 0] }, "N/A"]
        }
      }
    });

    // Stage 9: Unwind stockItems
    pipeline.push({
      $unwind: {
        path: "$transactionData.stockItems",
        preserveNullAndEmptyArrays: false
      }
    });

    // Stage 10: Lookup stockDetails for both `stockItems.stockCode` and `stocks.stock`
    pipeline.push({
      $addFields: {
        stockCodeToLookup: {
          $ifNull: [
            "$transactionData.stockItems.stockCode",
            "$transactionData.stockItems.stock"
          ]
        }
      }
    });

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "stockCodeToLookup",
        foreignField: "_id",
        as: "stockDetails"
      }
    });

    pipeline.push({
      $unwind: {
        path: "$stockDetails",
        preserveNullAndEmptyArrays: false
      }
    });


    if (filters.accountType.length > 0) {
      pipeline.push({
        $match: {
          "metalTransaction.partyCode": { $in: filters.accountType },
        },
      });
    }
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


    // Stage 6: Project only required fields
    pipeline.push({
      $project: {
        voucher: 1,
        transactionDate: 1,
        partyName: 1,
        stockIn: "$debit",
        stockOut: "$credit",
        grossWeight: "$grossWeight",
        purity: "$purity",
        pureWeight: "$pureWeight",
        value: {
          $ifNull: [
            "$stockDetails.stockItems.itemTotal.baseAmount",
            {
              $ifNull: [
                "$transactionData.stockItems.alternateAmount",
                0
              ]
            }
          ]
        },
        pcs: {
          $cond: {
            if: {
              $gt: [
                {
                  $ifNull: [
                    "$stockDetails.totalValue",
                    {
                      $ifNull: [
                        "$transactionData.stockItems.alternateAmount",
                        0
                      ]
                    }
                  ]
                },
                0
              ]
            },
            then: {
              $divide: [
                "$grossWeight",
                {
                  $ifNull: [
                    "$stockDetails.totalValue",
                    {
                      $ifNull: [
                        "$transactionData.stockItems.alternateAmount",
                        1 // fallback to 1 to avoid division by zero
                      ]
                    }
                  ]
                }
              ]
            },
            else: 0
          }
        },
        _id: 0,
        stockCode: {
          $ifNull: [
            "$stockDetails.code",
            {
              $ifNull: ["$stockDetails.altCode", "N/A"]
            }
          ]
        }
      }
    });




    // Stage 7: Sort by transactionDate for consistent ordering
    pipeline.push({
      $sort: {
        transactionDate: 1,
      },
    });
    return pipeline

    // Stage 5: Filter by account type if provided

    // Conditionally filter based on transactionType
    //  if (filters.transactionType) {
    //   pipeline.push({
    //     $match: {
    //       "metalTransaction.transactionType": filters.transactionType,
    //     },
    //   });
    // }

    return pipeline

    // Stage 4: Filter by voucher if provided
    // if (filters.voucher.length > 0) {
    //   pipeline.push({
    //     $match: {
    //       $or: [
    //         { "metalTransaction.voucherType": { $in: filters.voucher } },
    //         { reference: { $in: filters.voucher.map((id) => id.toString()) } },
    //       ],
    //     },
    //   });
    // }






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
    const pipeline = [];

    // Step 1: Base match condition
    const matchConditions = {
      isActive: true,
    };

    // Step 2: Add date filters (optional startDate and endDate)
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    // Step 3: Filter by reference starting with "SAL"
    matchConditions.reference = {
      $regex: '^SAL', // Matches references starting with "SAL"
      $options: 'i', // Case-insensitive
    };

    // Step 4: Include documents where metalTransactionId exists
    matchConditions.metalTransactionId = { $exists: true, $ne: null };

    // Step 5: Apply the initial match
    pipeline.push({ $match: matchConditions });

    // Step 6: Group by reference to select the first record
    pipeline.push({
      $group: {
        _id: "$reference",
        transactionId: { $first: "$transactionId" },
        metalTransactionId: { $first: "$metalTransactionId" },
        description: { $first: "$description" },
        transactionDate: { $first: "$transactionDate" },
      },
    });

    // Step 7: Project to restore fields for lookup
    pipeline.push({
      $project: {
        _id: 0,
        transactionId: 1,
        metalTransactionId: 1,
        reference: "$_id",
        description: 1,
        transactionDate: 1,
      },
    });

    // Step 8: Lookup metalTransaction data
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metaltransactions",
      },
    });

    // Step 9: Unwind metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions",
        preserveNullAndEmptyArrays: false, // Only keep documents with valid metaltransactions
      },
    });

    // Step 10: Filter for sales transactions only
    pipeline.push({
      $match: {
        "metaltransactions.transactionType": "sale",
      },
    });

    // Step 11: Unwind stockItems from metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions.stockItems",
        preserveNullAndEmptyArrays: false, // Only keep documents with valid stockItems
      },
    });

    // Step 12: Lookup metalstocks for stock details
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metaltransactions.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    // Step 13: Unwind metaldetail
    pipeline.push({
      $unwind: {
        path: "$metaldetail",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 14: Lookup karat details
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metaldetail.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    // Step 15: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 16: Lookup metal rate details
    pipeline.push({
      $lookup: {
        from: "metalratemasters",
        localField: "metaltransactions.stockItems.metalRate",
        foreignField: "_id",
        as: "metalRate",
      },
    });

    // Step 17: Unwind metalRate
    pipeline.push({
      $unwind: {
        path: "$metalRate",
        preserveNullAndEmptyArrays: true,
      },
    });


    // Step 18: Project the required fields
    pipeline.push({
      $project: {
        stockCode: "$metaltransactions.stockItems.stockCode",
        code: "$metaldetail.code",
        description: "$metaltransactions.stockItems.description",
        pcs: { $ifNull: ["$metaltransactions.stockItems.pieces", 0] },
        grossWeight: { $ifNull: ["$metaltransactions.stockItems.grossWeight", 0] },
        premium: { $ifNull: ["$metaltransactions.stockItems.premium.amount", 0] },
        makingCharge: { $ifNull: ["$metaltransactions.stockItems.makingCharges.amount", 0] },
        discount: { $literal: 0 }, // Explicitly set to 0
        purity: { $ifNull: ["$metaltransactions.stockItems.purity", 0] },
        pureWeight: { $ifNull: ["$metaltransactions.stockItems.pureWeight", 0] },
        totalAmount: {
          $ifNull: ["$metaltransactions.totalAmountSession.totalAmountAED", 0],
        },
        metalValue: { $ifNull: ["$metaltransactions.stockItems.metalRateRequirements.rate", 0] },
        _id: 0,
      },
    });

    // Step 19: Group by stockCode to consolidate transactions
    pipeline.push({
      $group: {
        _id: "$stockCode",
        description: { $first: "$description" }, // Take the first description
        code: { $first: "$code" }, // Take the first description
        pcs: { $sum: "$pcs" }, // Sum pieces
        grossWeight: { $sum: "$grossWeight" }, // Sum gross weight
        premium: { $sum: "$premium" }, // Sum premium
        makingCharge: { $sum: "$makingCharge" }, // Sum making charges
        discount: { $sum: "$discount" }, // Sum discount
        purity: { $first: "$purity" }, // Take the first purity
        pureWeight: { $sum: "$pureWeight" }, // Sum pure weight
        metalValue: { $sum: "$metalValue" }, // Sum metal value
        totalAmount: { $sum: "$totalAmount" }, // Sum total amount
      },
    });

    // Step 20: Project to format the transactions array
    pipeline.push({
      $project: {
        _id: 0,
        stockCode: "$_id", // Use the grouped _id as stockCode
        description: 1,
        code: 1,
        pcs: 1,
        grossWeight: 1,
        premium: 1,
        makingCharge: 1,
        discount: 1,
        purity: 1,
        pureWeight: 1,
        metalValue: 1,
        total: "$totalAmount",
      },
    });

    // Step 21: Group to calculate totals and collect transactions
    pipeline.push({
      $group: {
        _id: null,
        transactions: {
          $push: {
            stockCode: "$stockCode",
            description: "$description",
            code: "$code",
            pcs: "$pcs",
            grossWeight: "$grossWeight",
            premium: "$premium",
            discount: "$discount",
            purity: "$purity",
            pureWeight: "$pureWeight",
            metalValue: "$metalValue",
            makingCharge: "$makingCharge",
            total: "$total",
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

    // Step 22: Project the final output
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
  }

  calculateSalesAnalysis(salesReport, purchaseReport) {
    const salesTransactions = salesReport[0]?.transactions || [];
    const purchaseTransactions = purchaseReport[0]?.transactions || [];

    // Create purchase map by stockCode
    const purchaseMap = new Map();
    purchaseTransactions.forEach(p => {
      purchaseMap.set(p.stockCode.toString(), {
        makingCharge: p.makingCharge || 0,
        grossWeight: p.grossWeight || 0,
        total: p.total || 0,
      });
    });

    // Calculate and combine
    const combinedTransactions = salesTransactions.map(sale => {
      const stockCode = sale.stockCode.toString();
      const purchase = purchaseMap.get(stockCode) || {
        makingCharge: 0,
        grossWeight: 0,
        total: 0,
      };

      const saleGrossWeight = sale.grossWeight || 0;
      const saleMakingCharge = sale.makingCharge || 0;

      const purchaseGrossWeight = purchase.grossWeight || 0;
      const purchaseMakingCharge = purchase.makingCharge || 0;

      // Avg making charges
      const avgPurchaseMakingCharge = purchaseGrossWeight > 0
        ? purchaseMakingCharge / purchaseGrossWeight
        : 0;

      const avgSaleMakingCharge = saleGrossWeight > 0
        ? saleMakingCharge / saleGrossWeight
        : 0;

      // Cost of sale
      const cost = avgPurchaseMakingCharge * saleGrossWeight;

      // Profit metrics
      const profitMakingRate = avgSaleMakingCharge - avgPurchaseMakingCharge;
      const profitMakingAmount = saleMakingCharge - purchaseMakingCharge;

      return {
        id: sale.stockCode,
        stockCode: sale.code,
        description: sale.description,
        pcs: sale.pcs,
        grossWeight: saleGrossWeight,
        saleMakingCharge: saleMakingCharge,
        purchaseMakingCharge: purchaseMakingCharge,
        avgPurchaseMakingCharge: avgPurchaseMakingCharge,
        avgSaleMakingCharge: avgSaleMakingCharge,
        cost: cost,
        profitMakingRate: profitMakingRate,
        profitMakingAmount: profitMakingAmount,
        totalSale: sale.total,
        totalPurchase: purchase.total,
        profit: sale.total - purchase.total,
      };
    });

    // Totals (if needed)
    const totals = {
      totalPcs: combinedTransactions.reduce((sum, t) => sum + (t.pcs || 0), 0),
      totalGrossWeight: combinedTransactions.reduce((sum, t) => sum + (t.grossWeight || 0), 0),
      totalMakingCharge: combinedTransactions.reduce((sum, t) => sum + (t.saleMakingCharge || 0), 0),
      totalCost: combinedTransactions.reduce((sum, t) => sum + (t.cost || 0), 0),
      totalProfitMakingAmount: combinedTransactions.reduce((sum, t) => sum + (t.profitMakingAmount || 0), 0),
      totalProfit: combinedTransactions.reduce((sum, t) => sum + (t.profit || 0), 0),
    };

    return {
      transactions: combinedTransactions,
      totals,
    };
  }


  buildSalesAnalysisPurchase() {
    const pipeline = [];

    // Step 1: Base match condition
    const now = new Date();
    const currentYear = now.getFullYear();

    // If current month is Jan/Feb/Mar, financial year started last year
    const financialYearStart = new Date(
      now.getMonth() < 3 ? currentYear - 1 : currentYear,
      3, // April is month 3 (0-indexed)
      1,
      0, 0, 0, 0
    );

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const matchConditions = {
      isActive: true,
      transactionDate: {
        $gte: financialYearStart,
        $lte: todayEnd,
      },
    };



    // Step 3: Filter by reference starting with "SAL"
    matchConditions.reference = {
      $regex: '^PRM', // Matches references starting with "SAL"
      $options: 'i', // Case-insensitive
    };

    // Step 4: Include documents where metalTransactionId exists
    matchConditions.metalTransactionId = { $exists: true, $ne: null };

    // Step 5: Apply the initial match
    pipeline.push({ $match: matchConditions });

    // Step 6: Group by reference to select the first record
    pipeline.push({
      $group: {
        _id: "$reference",
        transactionId: { $first: "$transactionId" },
        metalTransactionId: { $first: "$metalTransactionId" },
        description: { $first: "$description" },
        transactionDate: { $first: "$transactionDate" },
      },
    });

    // Step 7: Project to restore fields for lookup
    pipeline.push({
      $project: {
        _id: 0,
        transactionId: 1,
        metalTransactionId: 1,
        reference: "$_id",
        description: 1,
        transactionDate: 1,
      },
    });

    // Step 8: Lookup metalTransaction data
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metaltransactions",
      },
    });

    // Step 9: Unwind metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions",
        preserveNullAndEmptyArrays: false, // Only keep documents with valid metaltransactions
      },
    });

    // Step 10: Filter for sales transactions only
    pipeline.push({
      $match: {
        "metaltransactions.transactionType": "purchase",
      },
    });

    // Step 11: Unwind stockItems from metaltransactions
    pipeline.push({
      $unwind: {
        path: "$metaltransactions.stockItems",
        preserveNullAndEmptyArrays: false, // Only keep documents with valid stockItems
      },
    });

    // Step 12: Lookup metalstocks for stock details
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metaltransactions.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });

    // Step 13: Unwind metaldetail
    pipeline.push({
      $unwind: {
        path: "$metaldetail",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 14: Lookup karat details
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "metaldetail.karat",
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    // Step 15: Unwind karatDetails
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 16: Lookup metal rate details
    pipeline.push({
      $lookup: {
        from: "metalratemasters",
        localField: "metaltransactions.stockItems.metalRate",
        foreignField: "_id",
        as: "metalRate",
      },
    });

    // Step 17: Unwind metalRate
    pipeline.push({
      $unwind: {
        path: "$metalRate",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Step 18: Project the required fields
    pipeline.push({
      $project: {
        stockCode: "$metaltransactions.stockItems.stockCode",
        description: "$metaltransactions.stockItems.description",
        pcs: { $ifNull: ["$metaltransactions.stockItems.pieces", 0] },
        grossWeight: { $ifNull: ["$metaltransactions.stockItems.grossWeight", 0] },
        premium: { $ifNull: ["$metaltransactions.stockItems.premium.amount", 0] },
        makingCharge: { $ifNull: ["$metaltransactions.stockItems.makingCharges.amount", 0] },
        discount: { $literal: 0 }, // Explicitly set to 0
        purity: { $ifNull: ["$metaltransactions.stockItems.purity", 0] },
        pureWeight: { $ifNull: ["$metaltransactions.stockItems.pureWeight", 0] },
        totalAmount: {
          $ifNull: ["$metaltransactions.totalAmountSession.totalAmountAED", 0],
        },
        metalValue: { $ifNull: ["$metaltransactions.stockItems.metalRateRequirements.rate", 0] },
        _id: 0,
      },
    });

    // Step 19: Group by stockCode to consolidate transactions
    pipeline.push({
      $group: {
        _id: "$stockCode",
        description: { $first: "$description" }, // Take the first description
        pcs: { $sum: "$pcs" }, // Sum pieces
        grossWeight: { $sum: "$grossWeight" }, // Sum gross weight
        premium: { $sum: "$premium" }, // Sum premium
        makingCharge: { $sum: "$makingCharge" }, // Sum making charges
        discount: { $sum: "$discount" }, // Sum discount
        purity: { $first: "$purity" }, // Take the first purity
        pureWeight: { $sum: "$pureWeight" }, // Sum pure weight
        metalValue: { $sum: "$metalValue" }, // Sum metal value
        totalAmount: { $sum: "$totalAmount" }, // Sum total amount
      },
    });

    // Step 20: Project to format the transactions array
    pipeline.push({
      $project: {
        _id: 0,
        stockCode: "$_id", // Use the grouped _id as stockCode
        description: 1,
        pcs: 1,
        grossWeight: 1,
        premium: 1,
        makingCharge: 1,
        discount: 1,
        purity: 1,
        pureWeight: 1,
        metalValue: 1,
        total: "$totalAmount",
      },
    });

    // Step 21: Group to calculate totals and collect transactions
    pipeline.push({
      $group: {
        _id: null,
        transactions: {
          $push: {
            stockCode: "$stockCode",
            description: "$description",
            pcs: "$pcs",
            grossWeight: "$grossWeight",
            premium: "$premium",
            discount: "$discount",
            purity: "$purity",
            pureWeight: "$pureWeight",
            metalValue: "$metalValue",
            makingCharge: "$makingCharge",
            total: "$total",
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

    // Step 22: Project the final output
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
    // if (filters.transactionType && filters.transactionType !== "all") {
    //   switch (filters.transactionType.toLowerCase()) {
    //     case "sales":
    //     case "sale":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "sales return":
    //     case "sale return":
    //     case "salereturn":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "net sales":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "purchase":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "purchase return":
    //     case "purchasereturn":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "net purchases":
    //       matchConditions.metalTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "receipts":
    //     case "metal-receipt":
    //       matchConditions.EntryTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "payment":
    //     case "payments":
    //     case "metal-payment":
    //       matchConditions.EntryTransactionId = { $exists: true, $ne: null };
    //       break;
    //     case "manufacture":
    //       matchConditions.description = {
    //         $regex: /manufacture|production|make/i,
    //       };
    //       break;
    //     case "transfer":
    //     case "transfer/adjustments":
    //       matchConditions.$or = [
    //         { TransferTransactionId: { $exists: true, $ne: null } },
    //         { description: { $regex: /transfer|adjustment|move/i } },
    //       ];
    //       break;
    //   }
    // }

    // Apply voucher prefix filtering safely
    if (filters.voucher && filters.voucher.length > 0) {
      const regexFilters = filters.voucher.map((prefix) => ({
        reference: { $regex: `^${prefix}\\d+`, $options: "i" }
      }));

      matchConditions.$or = regexFilters;
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

    pipeline.push({
      $lookup: {
        from: "inventorylogs",
        localField: "InventoryLogID",
        foreignField: "_id",
        as: "inventoryLog",
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
      $unwind: { path: "$inventoryLog", preserveNullAndEmptyArrays: true },
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


    // return pipeline

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
        localField: "inventoryLog.stockCode",
        foreignField: "_id",
        as: "inventoryStock",
      },
    });

 

    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "entryInfo.stockItems.stock",
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
      $unwind: { path: "$inventoryStock", preserveNullAndEmptyArrays: true },
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
            { "inventoryStock._id": { $in: stockIds } },
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

    // return pipeline
    // Project required fields for response
    pipeline.push({
      $project: {
        VocDate: "$transactionDate",
        VocType: {
          $ifNull: [
            "$metalTxnInfo.voucherType",
            "$entryInfo.type",
            "$entryInfo.voucherCode",
            "$inventoryLog.voucherType",
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

    const matchConditions = {};

    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) {
        matchConditions.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.createdAt.$lte = new Date(filters.endDate);
      }
    }
    if (filters.groupByRange?.stockCode?.length) {
      matchConditions.stockCode = { $in: filters.groupByRange.stockCode };
    }

    if (filters.voucher?.length) {
      const regexFilters = filters.voucher.map(v => new RegExp(`^${v.prefix}`, "i"));
      matchConditions.voucherCode = { $in: regexFilters };
    }

    pipeline.push({ $match: matchConditions });

    // Lookup stock details from metalstocks collection
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "stockCode",
        foreignField: "_id",
        as: "stockDetails",
      },
    });

    // Unwind the stockDetails array
    pipeline.push({
      $unwind: {
        path: "$stockDetails",
        preserveNullAndEmptyArrays: true,
      },
    });
    // Lookup karat purity from karatmasters
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "stockDetails.karat",
        foreignField: "_id",
        as: "karatDetails"
      }
    });

    // Unwind the karatDetails array
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true
      }
    });


    if (filters.division?.length) {
      pipeline.push({
        $match: {
          "karatDetails.division": { $in: filters.division }
        }
      });
    }

    // Group by stockCode to calculate totals
    pipeline.push({
      $group: {
        _id: "$stockCode",
        stockId: { $first: "$stockDetails._id" },
        code: { $first: "$stockDetails.code" },
        purity: { $first: "$karatDetails.standardPurity" },
        description: { $first: "$stockDetails.description" },
        totalValue: { $first: "$stockDetails.totalValue" },
        pcs: { $first: "$stockDetails.pcs" },
        weightData: {
          $push: {
            pcs: { $cond: [{ $eq: ["$pcs", true] }, 1, 0] },
            grossWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ["$transactionType", "sale"] }, then: { $multiply: ["$grossWeight", -1] } },
                  { case: { $eq: ["$transactionType", "metalPayment"] }, then: { $multiply: ["$grossWeight", -1] } },
                  { case: { $eq: ["$transactionType", "purchaseReturn"] }, then: { $multiply: ["$grossWeight", -1] } },
                  { case: { $eq: ["$transactionType", "saleReturn"] }, then: "$grossWeight" },
                  { case: { $eq: ["$transactionType", "purchase"] }, then: "$grossWeight" },
                  { case: { $eq: ["$transactionType", "metalReceipt"] }, then: "$grossWeight" },
                  { case: { $eq: ["$transactionType", "opening"] }, then: "$grossWeight" }
                ],
                default: 0
              }
            },
            pureWeight: {
              $multiply: [
                {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$transactionType", "sale"] }, then: { $multiply: ["$grossWeight", -1] } },
                      { case: { $eq: ["$transactionType", "metalPayment"] }, then: { $multiply: ["$grossWeight", -1] } },
                      { case: { $eq: ["$transactionType", "purchaseReturn"] }, then: { $multiply: ["$grossWeight", -1] } },
                      { case: { $eq: ["$transactionType", "saleReturn"] }, then: "$grossWeight" },
                      { case: { $eq: ["$transactionType", "purchase"] }, then: "$grossWeight" },
                      { case: { $eq: ["$transactionType", "metalReceipt"] }, then: "$grossWeight" },
                      { case: { $eq: ["$transactionType", "opening"] }, then: "$grossWeight" }
                    ],
                    default: 0
                  }
                },
                "$karatDetails.standardPurity"
              ]
            }
          }
        },
        metalReceipt: {
          $push: {
            pcs: { $cond: [{ $eq: ["$pcs", true] }, 1, 0] },
            grossWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ["$transactionType", "metalReceipt"] }, then: "$grossWeight" },
                ],
                default: 0
              }
            },
          }
        },
        openingBalance: {
          $push: {
            pcs: { $cond: [{ $eq: ["$pcs", true] }, 1, 0] },
            grossWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ["$transactionType", "opening"] }, then: "$grossWeight" },
                ],
                default: 0
              }
            },
          }
        },
        metalPayment: {
          $push: {
            pcs: { $cond: [{ $eq: ["$pcs", true] }, 1, 0] },
            grossWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ["$transactionType", "metalPayment"] }, then: "$grossWeight" },
                ],
                default: 0
              }
            },
          }
        }
      },
    });

    // Project to reshape the result
    pipeline.push({
      $project: {
        stockId: 1,
        code: 1,
        purity: 1,
        description: 1,
        totalValue: 1,
        pcs: 1,
        opening: {
          grossWeight: { $sum: "$openingBalance.grossWeight" },
          pcs: { $sum: "$weightData.pcs" },
        },
        Weight: {
          pcs: { $sum: "$weightData.pcs" },
          grossWeight: { $sum: "$weightData.grossWeight" },
          pureWeight: { $sum: "$weightData.pureWeight" },
          net: { $sum: "$weightData.pureWeight" },
        },
        netPurchase: {
          pcs: null,
          grossWeight: { $sum: "$weightData.grossWeight" }
        },
        receipt: {
          pcs: null,
          grossWeight: { $sum: "$metalReceipt.grossWeight" },
        },
        payment: {
          pcs: null,
          grossWeight: { $sum: "$metalPayment.grossWeight" },
        },
        closing: {
          pcs: null,
          grossWeight: { $sum: "$weightData.grossWeight" },
          pureWeight: { $sum: "$weightData.pureWeight" },
        },
      },
    });

    // Optional: remove entries with all zero values
    pipeline.push({
      $match: {
        $or: [
          { "opening.grossWeight": { $ne: 0 } },
          { "Weight.grossWeight": { $ne: 0 } },
          { "payment.grossWeight": { $ne: 0 } },
          { "receipt.grossWeight": { $ne: 0 } },
          { "closing.grossWeight": { $ne: 0 } },
        ],
      },
    });

    return pipeline;
  }

  buildStockPipeline(filters) {

    const pipeline = [];

    const matchConditions = {};

    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) {
        matchConditions.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.createdAt.$lte = new Date(filters.endDate);
      }
    }

    if (filters.transactionType && filters.transactionType !== 'All') {
      matchConditions.transactionType = filters.transactionType;
    }
    if (filters.groupByRange?.stockCode?.length) {
      matchConditions.stockCode = {
        $in: filters.groupByRange.stockCode.map(id => new ObjectId(id))
      };
    }
    if (filters.voucher?.length) {
      const regexFilters = filters.voucher.map(v => new RegExp(`^${v.prefix}`, "i"));
      matchConditions.voucherCode = { $in: regexFilters };
    }

    pipeline.push({ $match: matchConditions });

    // Lookup stock details from metalstocks collection
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "stockCode",
        foreignField: "_id",
        as: "stock",
      },
    });

    // Unwind the stock array
    pipeline.push({
      $unwind: {
        path: "$stock",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Lookup karat purity from karatmasters
    pipeline.push({
      $lookup: {
        from: "karatmasters",
        localField: "stock.karat", // Corrected from stockDetails.karat
        foreignField: "_id",
        as: "karatDetails",
      },
    });

    // Unwind the karatDetails array
    pipeline.push({
      $unwind: {
        path: "$karatDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Lookup metal type from metaltypes (assuming metalTypeInfo.description is needed)
    pipeline.push({
      $lookup: {
        from: "metaltypes",
        localField: "stock.metalType",
        foreignField: "_id",
        as: "metalTypeDetails",
      },
    });

    // Unwind the metalTypeDetails array
    pipeline.push({
      $unwind: {
        path: "$metalTypeDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    if (filters.division?.length) {
      pipeline.push({
        $match: {
          "karatDetails.division": { $in: filters.division },
        },
      });
    }

    // Group by stockCode to calculate totals
    pipeline.push({
      $group: {
        _id: "$stockCode",
        totalGrossWeight: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$transactionType", "sale"] }, then: { $multiply: ["$grossWeight", -1] } },
                { case: { $eq: ["$transactionType", "metalPayment"] }, then: { $multiply: ["$grossWeight", -1] } },
                { case: { $eq: ["$transactionType", "purchaseReturn"] }, then: { $multiply: ["$grossWeight", -1] } },
                { case: { $eq: ["$transactionType", "saleReturn"] }, then: "$grossWeight" },
                { case: { $eq: ["$transactionType", "purchase"] }, then: "$grossWeight" },
                { case: { $eq: ["$transactionType", "metalReceipt"] }, then: "$grossWeight" },
                { case: { $eq: ["$transactionType", "opening"] }, then: "$grossWeight" },
              ],
              default: 0,
            },
          },
        },
        pcs: { $first: "$stock.pcs" }, // Use stock.pcs
        code: { $first: "$code" },
        description: { $first: "$stock.description" }, // Add description
        purity: { $first: "$karatDetails.standardPurity" }, // Add purity from karatDetails
        totalValue: { $first: "$stock.totalValue" }, // Include totalValue
        metalId: { $first: "$stock._id" }, // Include metalId
        stockName: { $first: "$stock.code" }, // Include stockName
        metalType: { $first: "$metalTypeDetails.description" }, // Include metalType description
      },
    });

    // Calculate pureWeight based on totalGrossWeight and purity
    pipeline.push({
      $project: {
        _id: 0,
        code: 1,
        description: 1,
        purity: 1,
        pureWeight: {
          $cond: {
            if: { $and: [{ $ne: ["$purity", null] }, { $ne: ["$purity", 0] }] },
            then: { $divide: [{ $multiply: ["$totalGrossWeight", "$purity"] }, 24] }, // Assuming karat-based purity (e.g., 24K = 100%)
            else: "$totalGrossWeight", // Fallback to grossWeight if purity is null or 0
          },
        },
        pcs: 1,
        gross: "$totalGrossWeight", // Rename totalGrossWeight to gross
        totalValue: 1,
        metalId: 1,
        stockName: 1,
        metalType: 1,
      },
    });

    // Optional: Filter out entries with zero gross weight (if needed)
    pipeline.push({
      $match: {
        gross: { $ne: 0 },
      },
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
        code: { $ifNull: ["$metaldetail.code", 0] },
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
            code: "$code",
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


  getReceivablesAndPayables() {
    const pipeline = [
      {
        $facet: {
          receivables: [
            {
              $match: {
                "balances.goldBalance.totalGrams": { $lt: 0 }
              }
            },
            {
              $group: {
                _id: null,
                totalReceivableGrams: {
                  $sum: { $abs: "$balances.goldBalance.totalGrams" }
                },
                accountCount: { $sum: 1 } // Count number of accounts
              }
            }
          ],
          payables: [
            {
              $match: {
                "balances.goldBalance.totalGrams": { $gt: 0 }
              }
            },
            {
              $group: {
                _id: null,
                totalPayableGrams: {
                  $sum: "$balances.goldBalance.totalGrams"
                },
                accountCount: { $sum: 1 } // Count number of accounts
              }
            }
          ]
        }
      },
      {
        $project: {
          totalReceivableGrams: {
            $ifNull: [{ $arrayElemAt: ["$receivables.totalReceivableGrams", 0] }, 0]
          },
          totalPayableGrams: {
            $ifNull: [{ $arrayElemAt: ["$payables.totalPayableGrams", 0] }, 0]
          },
          avgReceivableGrams: {
            $cond: {
              if: {
                $eq: [{ $arrayElemAt: ["$receivables.accountCount", 0] }, 0]
              },
              then: 0,
              else: {
                $divide: [
                  { $ifNull: [{ $arrayElemAt: ["$receivables.totalReceivableGrams", 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ["$receivables.accountCount", 0] }, 1] }
                ]
              }
            }
          },
          avgPayableGrams: {
            $cond: {
              if: {
                $eq: [{ $arrayElemAt: ["$payables.accountCount", 0] }, 0]
              },
              then: 0,
              else: {
                $divide: [
                  { $ifNull: [{ $arrayElemAt: ["$payables.totalPayableGrams", 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ["$payables.accountCount", 0] }, 1] }
                ]
              }
            }
          }
        }
      }
    ];

    return pipeline;
  }
  formatedOwnStock(reportData, receivablesAndPayables) {
    const summary = {
      totalGrossWeight: 0,
      netGrossWeight: 0,
      totalValue: 0,
      totalReceivableGrams: 0,
      totalPayableGrams: 0,
      avgGrossWeight: 0,
      avgReceivableGrams: 0,
      avgPayableGrams: 0,
      avgBidValue: 0
    };

    // Extract receivable/payable safely
    if (receivablesAndPayables?.length) {
      summary.totalReceivableGrams = receivablesAndPayables[0].totalReceivableGrams || 0;
      summary.totalPayableGrams = receivablesAndPayables[0].totalPayableGrams || 0;
      summary.avgReceivableGrams = receivablesAndPayables[0].avgReceivableGrams || 0;
      summary.avgPayableGrams = receivablesAndPayables[0].avgPayableGrams || 0;
    }

    const categories = reportData.map((item) => {
      summary.totalGrossWeight += item.totalGrossWeight || 0;
      summary.netGrossWeight += item.netGrossWeight || 0;
      summary.totalValue += item.totalValue || 0;

      return {
        category: item.category,
        description: item.description,
        transactionCount: item.transactionCount,
        totalValue: item.totalValue,
        avgGrossWeight: item.avgGrossWeight,
        totalGrossWeight: item.totalGrossWeight,
        avgBidValue: item.avgBidValue,
        netGrossWeight: item.netGrossWeight,
        latestTransactionDate: item.latestTransactionDate,
      };
    });

    return {
      summary,
      categories
    };
  }


  OwnStockPipeLine(filters) {
    const pipeline = [];

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
       Step 7: Sort by transactionDate to ensure consistent $first selection
    ------------------------------------------ */
    pipeline.push({ $sort: { transactionDate: 1 } }); // Sort ascending to get the earliest entry

    /* ------------------------------------------
       Step 8: First Group by full reference to take first value per unique voucher
    ------------------------------------------ */
    pipeline.push({
      $group: {
        _id: "$reference", // Group by full reference (e.g., PF0006, PR0001) to consolidate voucher entries
        totalValue: { $first: { $ifNull: ["$value", 0] } }, // Take the first value for this voucher
        totalGrossWeight: { $first: { $ifNull: ["$grossWeight", 0] } }, // Take the first gross weight
        totalbidvalue: { $first: { $ifNull: ["$goldBidValue", 0] } }, // Take the first gross weight
        totalDebit: { $first: { $ifNull: ["$debit", 0] } }, // Take the first debit
        totalCredit: { $first: { $ifNull: ["$credit", 0] } }, // Take the first credit
        latestTransactionDate: { $max: "$transactionDate" }, // Latest date for this voucher
      },
    });

    return pipeline
    /* ------------------------------------------
       Step 9: Second Group by prefix to sum across unique vouchers
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
        totalValue: { $sum: "$totalValue" }, // Sum the first values across unique vouchers
        totalGrossWeight: { $sum: "$totalGrossWeight" }, // Sum the first gross weights
        totalbidvalue: { $sum: "$totalbidvalue" }, // Sum the first gross weights
        totalDebit: { $sum: "$totalDebit" }, // Sum the first debits
        totalCredit: { $sum: "$totalCredit" }, // Sum the first credits
        transactionCount: { $sum: 1 }, // Count unique vouchers (e.g., OSB001, OSB002, OSB003)
        latestTransactionDate: { $max: "$latestTransactionDate" }, // Latest date across vouchers
      },
    });

    /* ------------------------------------------
       Step 10: Project to format the output with average
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
        avgGrossWeight: {
          $cond: {
            if: { $eq: ["$transactionCount", 0] },
            then: 0,
            else: { $divide: ["$totalGrossWeight", "$transactionCount"] },
          },
        },
        avgBidValue: {
          $cond: {
            if: { $eq: ["$transactionCount", 0] },
            then: 0,
            else: { $divide: ["$totalbidvalue", "$transactionCount"] },
          },
        },
        transactionCount: 1,
        latestTransactionDate: 1,
      },
    });

    /* ------------------------------------------
       Step 11: Sort by category
    ------------------------------------------ */
    pipeline.push({
      $sort: { category: 1 }, // Sort alphabetically by category
    });

    return pipeline;
  }

  metalFxingPipeLine(filters) {

    const pipeline = [];
    const matchConditions = {};

    // Step 1: Filter for specific transaction types
    matchConditions.$or = [
      { type: { $in: ["purchase-fixing", "sales-fixing"] } },
      { costCenter: "INVENTORY" }
    ];

    if (filters.voucher && filters.voucher.length > 0) {
      const regexFilters = filters.voucher.map((prefix) => ({
        reference: { $regex: `^${prefix}\\d+$`, $options: "i" }
      }));

      pipeline.push({
        $match: {
          $or: regexFilters
        }
      });
    }
    
    // Step 2: Date filtering (optional, based on filters)
    if (filters.startDate || filters.endDate) {
      matchConditions.transactionDate = {};
      if (filters.startDate) {
        matchConditions.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchConditions.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    // Add match stage to pipeline
    pipeline.push({ $match: matchConditions });

    // Step 3: Lookup parties from accounts collection
    pipeline.push({
      $lookup: {
        from: "accounts", // Collection name for parties
        localField: "party", // Field in the current collection
        foreignField: "_id", // Field in the accounts collection
        as: "parties" // Output array field
      }
    });

    // Step 4: Unwind parties if you expect a single party per document
    pipeline.push({
      $unwind: {
        path: "$parties",
        preserveNullAndEmptyArrays: true // Keep documents even if no party is found
      }
    });

    // Step 5: Sort by transactionDate in descending order (LIFO)
    pipeline.push({
      $sort: {
        transactionDate: -1 // -1 for descending order (latest first)
      }
    });

    // Step 6: Project to match the UI structure
    pipeline.push({
      $project: {
        voucher: "$reference", // Maps to the voucher number (e.g., "PUR-2026")
        date: {
          $dateToString: {
            format: "%d/%m/%Y",
            date: "$transactionDate" // Maps to the transaction date (e.g., "31/07/2025")
          }
        },
        partyName: "$parties.customerName", // Maps to the party name (e.g., "Amal Test New")
        stockIn: "$goldCredit", // Maps to stock in (e.g., 0)
        stockOut: "$goldDebit", // Maps to stock out (e.g., 2000)
        balance: {
          $subtract: [
            "$runningBalance", // Adjust based on how balance is calculated
            { $add: ["$goldDebit", { $ifNull: ["$goldCredit", 0] }] }
          ]
        }, // Maps to balance (e.g., -1000), adjust logic if needed
        rate: "$goldBidValue", // Maps to rate (e.g., 377.98538), corrected from goldBidValue
        value: {
          $multiply: [
            "$goldBidValue",
            { $subtract: ["$goldCredit", "$goldDebit"] }
          ]
        }, // Maps to value (e.g., -755970.76), adjust if weight is involved
        average: 307.12 // Placeholder; calculate based on context (e.g., weighted average of rates)
      }
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
