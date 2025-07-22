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
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
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
      console.log('====================================');
      console.log(reportData);
      console.log('====================================');
      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: false,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
    }
  }



  async getPurchaseMetalReport(filters) {
    try {

      console.log('====================================');
      console.log("On the Purchase");
      console.log('====================================');

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
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
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
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
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
      console.log('====================================');
      console.log(reportData);
      console.log('====================================');

      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);


      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(`Failed to generate stock movement report: ${error.message}`);
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
      console.log('====================================');
      console.log(reportData);
      console.log('====================================');
      // Format the retrieved data for response
      const formattedData = this.formatReportData(reportData, validatedFilters);

      return {
        success: true,
        data: reportData,
        filters: validatedFilters,
        totalRecords: reportData.length,
      };
    } catch (error) {
      throw new Error(`Failed to generate metal stock ledger report: ${error.message}`);
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
      groupByRange = {
        stockCode: [],
        categoryCode: [],
        karat: [],
        type: [],
        supplier: [],
        purchaseRef: [],
      },
      costCenter
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
      discount
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
          if (["karat", "categoryCode", "supplier", "type", "brand"].includes(key)) {
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
    if (filters.groupByRange && typeof filters.groupByRange === 'object') {
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

  buildStockAnalysis(filters) {
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
    if (filters.groupByRange && typeof filters.groupByRange === 'object') {
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
        stockCode: "$stockDetails.code",
        voucherNumber: "$metalTransaction.voucherNumber",
        voucherType: "$metalTransaction.voucherType",
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
        discount: {
          $cond: {
            if: filters.discount,
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


  buildStockMovementPipeline(filters) {
    const pipeline = [];
  
    // 1. Match only active + opening stock
    const matchConditions = {
      isActive: true,
      type: "GOLD_STOCK",
    };
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
    pipeline.push({ $unwind: { path: "$metalInfo", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $unwind: { path: "$metalTxnInfo", preserveNullAndEmptyArrays: true } });
  
    // 5. Karat details (optional)
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
  
    // 6. Join fallback stock detail
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTxnInfo.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    });
  
    pipeline.push({ $unwind: { path: "$metaldetail", preserveNullAndEmptyArrays: true } });

    // return pipeline
  
    // 7. Project clean fields
    pipeline.push({
      $project: {
        grossWeight: 1,
        pureWeight: 1,
        pcs: {
          $ifNull: ["$metalInfo.pcsCount", "$metalTxnInfo.stockItems.pcsCount"],
        },
        code: {
          $ifNull: ["$metalInfo.code", "$metaldetail.code"],
        },
        description: {
          $ifNull: ["$metalInfo.description", "$metaldetail.description"],
        },
      },
    });
  
    // 8. Group by CODE only
    pipeline.push({
      $group: {
        _id: "$code",
        description: { $first: "$description" }, // take one valid description
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalPcs: { $sum: { $ifNull: ["$pcs", 0] } },
      },
    });

    pipeline.push({
      $lookup: {
        from: "entries",
        let: { stockCode: "$_id" }, // using code like "BANGLE916"
        pipeline: [
          { $match: { $expr: { $in: ["$type", ["metal-payment", "metal-receipt"]] } } },
          { $unwind: "$stocks" },
          {
            $lookup: {
              from: "metalstocks",
              localField: "stocks.stock",
              foreignField: "_id",
              as: "linkedStock"
            }
          },
          { $unwind: "$linkedStock" },
          {
            $match: {
              $expr: { $eq: ["$linkedStock.code", "$$stockCode"] }
            }
          },
          {
            $project: {
              type: 1,
              grossWeight: "$stocks.grossWeight"
            }
          }
        ],
        as: "entryMovements"
      }
    });

    pipeline.push({
      $addFields: {
        paymentGross: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-payment"] }
                }
              },
              as: "p",
              in: "$$p.grossWeight"
            }
          }
        },
        receiptGross: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$entryMovements",
                  as: "e",
                  cond: { $eq: ["$$e.type", "metal-receipt"] }
                }
              },
              as: "r",
              in: "$$r.grossWeight"
            }
          }
        }
      }
    });


  
    // 9. Final format
    pipeline.push({
      $project: {
        _id: 0,
        code: "$_id",
        description: { $ifNull: ["$description", "No Description"] },
        opening: {
          pcs: "$totalPcs",
          grossWeight: "$totalGrossWeight"
        },
        payment: {
          pcs: null,
          grossWeight: "$paymentGross"
        },
        receipt: {
          pcs: null,
          grossWeight: "$receiptGross"
        },
        totalPureWeight: 1
      }
    });
    
    
  
    return pipeline;
  
  

    return pipeline
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

    return pipeline

    // Stage 11.1: Apply groupByRange filters if present
    if (filters.groupByRange && typeof filters.groupByRange === 'object') {
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


  buildStockPipeline(filters) {
    const pipeline = [];

    // Base filter
    const matchConditions = {
      isActive: true,
      type: "GOLD_STOCK",
    };

    pipeline.push({ $match: matchConditions });

    // Join metalInfo (for inventory)
    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalId",
        foreignField: "_id",
        as: "metalInfo",
      },
    });

    // Join metalTxnInfo (for purchase)
    pipeline.push({
      $lookup: {
        from: "metaltransactions",
        localField: "metalTransactionId",
        foreignField: "_id",
        as: "metalTxnInfo",
      },
    });

    pipeline.push({ $unwind: { path: "$metalInfo", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $unwind: { path: "$metalTxnInfo", preserveNullAndEmptyArrays: true } });
    pipeline.push({
      $unwind: {
        path: "$metalTxnInfo.stockItems",
        preserveNullAndEmptyArrays: true,
      },
    });

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



    pipeline.push({
      $lookup: {
        from: "metalstocks",
        localField: "metalTxnInfo.stockItems.stockCode",
        foreignField: "_id",
        as: "metaldetail",
      },
    })

    pipeline.push({ $unwind: { path: "$metaldetail", preserveNullAndEmptyArrays: true } });



    // Project merged structure
    pipeline.push({
      $project: {
        grossWeight: 1,
        pureWeight: 1,
        pcs: {
          $ifNull: ["$metalInfo.pcsCount", "$metalTxnInfo.stockItems.pcsCount"],
        },
        code: {
          $ifNull: ["$metalInfo.code", "$metaldetail.code"],
        },
        description: {
          $ifNull: ["$metalInfo.description", "$metaldetail.description"],
        },
      },
    });


    // Grouping total by code + description
    pipeline.push({
      $group: {
        _id: {
          code: "$code",
          description: "$description",
        },
        totalGrossWeight: { $sum: "$grossWeight" },
        totalPureWeight: { $sum: "$pureWeight" },
        totalPcs: { $sum: { $ifNull: ["$pcs", 0] } },
      },
    });

    // Rename _id fields
    pipeline.push({
      $project: {
        _id: 0,
        code: "$_id.code",
        description: "$_id.description",
        totalGrossWeight: 1,
        totalPureWeight: 1,
        totalPcs: 1,
      },
    });
    return pipeline

    if (filters.division.length > 0) {
      pipeline.push({
        $match: {
          "metalInfo.metalType": { $in: filters.division }
        }
      });
    }

    const groupByMatch = {};

    // Dynamically add conditions based on non-empty arrays
    if (filters.groupByRange?.stockCode?.length > 0) {
      groupByMatch["metalInfo.code"] = { $in: filters.groupByRange.stockCode };
    }

    if (filters.groupByRange?.categoryCode?.length > 0) {
      groupByMatch["metalInfo.category"] = { $in: filters.groupByRange.categoryCode };
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
          purity: "$purity"
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
              { $round: [{ $divide: ["$grossWeight", "$metalInfo.totalValue"] }, 0] },
              0
            ]
          }
        },
        logs: { $push: "$$ROOT" }
      }
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
          _id: 0
        }
      });
    }
    return pipeline
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