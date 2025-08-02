import Entry from "../../models/modules/EntryModel.js";
import Registry from "../../models/modules/Registry.js";
import AccountType from "../../models/modules/AccountType.js";
import AccountMaster from "../../models/modules/accountMaster.js";
import InventoryService from "../../services/modules/inventoryService.js";

const createEntry = async (req, res) => {
  try {
    const { type, stocks, cash } = req.body;
    console.log(req.body)
    const stockItems = stocks;
    console.log(stockItems);

    // Validate entry type
    const validTypes = [
      "metal-receipt",
      "metal-payment",
      "cash receipt",
      "cash payment",
      "currency-receipt",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid entry type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Validate required fields based on type
    if (["metal-receipt", "metal-payment"].includes(type)) {
      if (
        !stockItems ||
        !Array.isArray(stockItems) ||
        stockItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "stockItems array is required and must not be empty for metal entries",
        });
      }
      if (cash && Array.isArray(cash) && cash.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cash array should not be provided for metal entries",
        });
      }
      // Validate stock field in stockItems
      for (const item of stockItems) {
        if (!item.stock) {
          return res.status(400).json({
            success: false,
            message: "Each stockItem must include a valid stock field",
          });
        }
      }
    } else if (["cash receipt", "cash payment"].includes(type)) {
      if (!cash || !Array.isArray(cash) || cash.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cash array is required and must not be empty for cash entries",
        });
      }
      if (stockItems && Array.isArray(stockItems) && stockItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: "stockItems array should not be provided for cash entries",
        });
      }
    }

    // Prepare entry data
    const entryData = {
      type,
      voucherCode: req.body.voucherCode,
      voucherDate: req.body.voucherDate,
      party: req.body.party,
      enteredBy: req.admin.id,
      remarks: req.body.remarks,
      // Only include relevant fields based on type
      ...(type.includes("metal") ? { stockItems } : {}),
      ...(type.includes("cash") ? { cash } : {}),
    };

    const entry = new Entry(entryData);

    // Handle specific entry types
    const handlers = {
      "metal-receipt": handleMetalReceipt,
      "metal-payment": handleMetalPayment,
      "cash receipt": handleCashReceipt,
      "cash payment": handleCashPayment,
    };

    if (handlers[type]) {
      await handlers[type](entry);
    }

    // Save entry
    await entry.save();

    res.status(201).json({
      success: true,
      data: entry,
      message: `${type} entry created successfully`,
    });
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

const handleMetalReceipt = async (entry) => {
  console.log(entry);
  for (const stockItem of entry.stockItems) {
    const transactionId = await Registry.generateTransactionId();
    const description =
      stockItem.remarks?.trim() || "Metal receipt transaction";

    // Create GOLD_STOCK registry entry
    await Registry.create({
      transactionId,
      EntryTransactionId: entry._id,
      type: "GOLD_STOCK",
      description,
      value: stockItem.grossWeight,
      credit: stockItem.grossWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
      purity: stockItem.purity,
      grossWeight: stockItem.grossWeight,
      pureWeight: stockItem.purityWeight,
    });

    // Create GOLD registry entry
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      EntryTransactionId: entry._id,
      type: "GOLD",
      description,
      value: stockItem.purityWeight,
      debit: stockItem.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });

    // Update inventory
    await InventoryService.updateInventory(
      {
        stockItems: [
          {
            stockCode: {
              _id: stockItem.stock,
              code: stockItem.stock.toString(),

            },
            pieces: stockItem.pieces || 0,
            grossWeight: stockItem.grossWeight,
            purity: stockItem.purity,
            voucherNumber: entry.voucherCode,
          },
        ],
      },
      false,
      entry.enteredBy, // ← this should be a valid user ID
    );
  }
};

const handleCashReceipt = async (entry) => {
  const accountType = await AccountType.findOne({ _id: entry.party });
  if (!accountType) {
    throw new Error("Account not found");
  }

  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashType) {
      throw new Error(
        `Cash type account not found for ID: ${cashItem.cashType}`
      );
    }

    // Initialize balances if needed
    accountType.balances = accountType.balances || {};
    accountType.balances.cashBalance = accountType.balances.cashBalance || {
      currency: cashItem.currency,
      amount: 0,
      lastUpdated: new Date(),
    };

    // Update balances
    const amount = Number(cashItem.amount) || 0;
    accountType.balances.cashBalance.amount += amount;
    accountType.balances.cashBalance.lastUpdated = new Date();
    cashType.openingBalance = (cashType.openingBalance || 0) + amount;

    // Save updates
    await Promise.all([accountType.save(), cashType.save()]);

    // Create registry entries
    await Promise.all([
      Registry.create({
        transactionId,
        type: "PARTY_CASH_BALANCE",
        description:
          cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash receipt",
        value: amount,
        credit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: entry.party?.toString(),
        isBullion: false,
      }),
      Registry.create({
        transactionId: await Registry.generateTransactionId(),
        type: "CASH",
        description:
          cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash receipt",
        value: amount,
        debit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: true,
      }),
    ]);
  }
};

const handleCashPayment = async (entry) => {
  const accountType = await AccountType.findOne({ _id: entry.party });
  if (!accountType) {
    throw new Error("Account not found");
  }

  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashType) {
      throw new Error(
        `Cash type account not found for ID: ${cashItem.cashType}`
      );
    }

    // Initialize balances if needed
    accountType.balances = accountType.balances || {};
    accountType.balances.cashBalance = accountType.balances.cashBalance || {
      currency: cashItem.currency,
      amount: 0,
      lastUpdated: new Date(),
    };

    // Update balances
    const amount = Number(cashItem.amount) || 0;
    accountType.balances.cashBalance.amount -= amount;
    accountType.balances.cashBalance.lastUpdated = new Date();
    cashType.openingBalance = (cashType.openingBalance || 0) - amount;

    // Save updates
    await Promise.all([accountType.save(), cashType.save()]);

    // Create registry entries
    await Promise.all([
      Registry.create({
        transactionId,
        type: "PARTY_CASH_BALANCE",
        description:
          cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash payment",
        value: amount,
        debit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: entry.party?.toString(),
        isBullion: false,
      }),
      Registry.create({
        transactionId: await Registry.generateTransactionId(),
        type: "CASH",
        description:
          cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash payment",
        value: amount,
        credit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: true,
      }),
    ]);
  }
};

const handleMetalPayment = async (entry) => {
  for (const stockItem of entry.stockItems) {
    const transactionId = await Registry.generateTransactionId();
    const description =
      stockItem.remarks?.trim() || "Metal payment transaction";

    // Create GOLD_STOCK registry entry
    await Registry.create({
      transactionId,
      EntryTransactionId: entry._id,
      type: "GOLD_STOCK",
      description,
      value: stockItem.purityWeight,
      debit: stockItem.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
      purity: stockItem.purity,
      grossWeight: stockItem.grossWeight,
      pureWeight: stockItem.purityWeight,
    });

    // Create GOLD registry entry
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      EntryTransactionId: entry._id,
      type: "GOLD",
      description,
      value: stockItem.purityWeight,
      credit: stockItem.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });

    // Update inventory
    await InventoryService.updateInventory(
      {
        stockItems: [
          {
            stockCode: {
              _id: stockItem.stock,
              code: stockItem.stock.toString(),
            },
            pieces: stockItem.pieces || 0,
            grossWeight: stockItem.grossWeight,
            purity: stockItem.purity,
            voucherNumber: entry.voucherCode,
          },
        ],
      },
      true,
      entry.enteredBy,
    );
  }
};

const getEntriesByType = async (type) => {
  return Entry.find({ type })
    .populate("voucherId")
    .populate("party")
    .populate("enteredBy")
    .populate("stockItems.stock")
    .sort({ createdAt: -1 });
};

const getCashPayments = async (req, res) => {
  try {
    const entries = await getEntriesByType("cash payment");
    res.json(entries);
  } catch (err) {
    console.error("Error fetching cash payments:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash payments",
      error: err.message,
    });
  }
};

const getCashReceipts = async (req, res) => {
  try {
    const entries = await getEntriesByType("cash receipt");
    res.json(entries);
  } catch (err) {
    console.error("Error fetching cash receipts:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash receipts",
      error: err.message,
    });
  }
};

const getMetalPayments = async (req, res) => {
  try {
    const entries = await getEntriesByType("metal-payment");
    res.json(entries);
  } catch (err) {
    console.error("Error fetching metal payments:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch metal payments",
      error: err.message,
    });
  }
};

const getMetalReceipts = async (req, res) => {
  try {
    const entries = await getEntriesByType("metal-receipt");
    console.log("first")
    console.log(entries)
    res.json(entries);
  } catch (err) {
    console.error("Error fetching metal receipts:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch metal receipts",
      error: err.message,
    });
  }
};

const getEntryById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id)
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stockItems.stock");
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    res.json(entry);
  } catch (err) {
    console.error("Error fetching entry:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch entry",
      error: err.message,
    });
  }
};

export default {
  createEntry,
  getCashPayments,
  getCashReceipts,
  getMetalPayments,
  getMetalReceipts,
  getEntryById,
};
