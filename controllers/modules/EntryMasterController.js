import Entry from "../../models/modules/EntryModel.js";
import Registry from "../../models/modules/Registry.js";
import AccountType from "../../models/modules/AccountType.js";
import AccountMaster from "../../models/modules/accountMaster.js";
import InventoryService from "../../services/modules/inventoryService.js";
import RegistryService from "../../services/modules/RegistryService.js";
import AccountLog from "../../models/modules/AccountLog.js";
import { createAppError } from "../../utils/errorHandler.js";

const createEntry = async (req, res) => {
  try {
    const { type, stocks, cash } = req.body;
    const stockItems = stocks;

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

const editEntry = async (req, res) => {
  try {
    const { type, stocks, cash, voucherCode } = req.body;
    const stockItems = stocks;

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
      if (!stockItems || !Array.isArray(stockItems) || stockItems.length === 0) {
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

    // First, delete related registry records
    await RegistryService.deleteRegistryByVoucher(voucherCode);

    // Find the existing entry
    const entry = await Entry.findOne({ voucherCode });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found for the given voucherCode",
      });
    }

    // Update fields
    entry.type = type;
    entry.voucherDate = req.body.voucherDate;
    entry.party = req.body.party;
    entry.enteredBy = req.admin.id;
    entry.remarks = req.body.remarks;

    if (type.includes("metal")) {
      entry.stockItems = stockItems;
      entry.cash = [];
    } else if (type.includes("cash")) {
      entry.cash = cash;
      entry.stockItems = [];
    }

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

    // Save updated entry
    await entry.save();

    return res.status(200).json({
      success: true,
      data: entry,
      message: `${type} entry edit successfully completed`,
    });
  } catch (err) {
    console.error("Error editing entry:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


const handleMetalReceipt = async (entry) => {

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
            transactionType: "metalReceipt"
          },
        ],
      },
      false,
      entry.enteredBy, // ← this should be a valid user ID
    );
  }
};

const handleCashReceipt = async (entry) => {

  // Validate entry object
  if (!entry?.party || !entry?.cash || !Array.isArray(entry.cash)) {
    throw createAppError("Invalid entry data", 400, "INVALID_ENTRY");
  }

  // Fetch account
  const account = await AccountType.findOne({ _id: entry.party });
  if (!account) {
    throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }


  // Process each cash item
  for (const cashItem of entry.cash) {
    // Validate cash item
    if (!cashItem?.cashType || !cashItem?.amount || !cashItem?.currency) {
      throw createAppError("Invalid cash item data", 400, "INVALID_CASH_ITEM");
    }

    const transactionId = await Registry.generateTransactionId();
    const cashAccount = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashAccount) {
      throw createAppError(
        `Cash type account not found for ID: ${cashItem.cashType}`,
        404,
        "CASH_TYPE_NOT_FOUND"
      );
    }

    // Initialize account balances
    account.balances = account.balances || {};
    account.balances.cashBalance = account.balances.cashBalance || {
      currency: cashItem.currency,
      amount: 0,
      lastUpdated: new Date(),
    };

    // Calculate new balances
    const amount = Number(cashItem.amount) || 0;
    if (amount <= 0) {
      throw createAppError("Amount must be positive", 400, "INVALID_AMOUNT");
    }
    const previousBalance = account.balances.cashBalance.amount || 0;
    const balanceAfter = previousBalance + amount;

    // Update balances
    account.balances.cashBalance.amount = balanceAfter;
    account.balances.cashBalance.lastUpdated = new Date();
    cashAccount.openingBalance = (cashAccount.openingBalance || 0) + amount;

    // Create registry entries
    const description = cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash receipt";
    const registryEntries = [
      {
        transactionId,
        type: "PARTY_CASH_BALANCE",
        description,
        value: amount,
        credit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: entry.party?.toString(),
        isBullion: false,
      },
      {
        transactionId: await Registry.generateTransactionId(),
        type: "CASH",
        description,
        value: amount,
        debit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: true,
      },
    ];

    // 👉 If VAT exists, add extra registry entry
    if (cashItem.vatAmount && cashItem.vatAmount > 0) {
      registryEntries.push({
        transactionId: await Registry.generateTransactionId(),
        type: "VAT_AMOUNT",
        description: `VAT on cash receipt`,
        value: cashItem.vatAmount,
        debit: cashItem.vatAmount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: false,
      });
    }

    // Create account log entry
    const accountLogEntry = {
      accountId: cashItem.cashType,
      transactionType: "deposit",
      amount,
      reference: entry.voucherCode,
      balanceAfter: cashAccount.openingBalance,
      note: `Cash receipt of ${amount}  for account ${account.customerName}`,
      action: "add",
      transactionId,
      createdBy: entry.enteredBy,
      createdAt: new Date(),
    };

    // Save all changes in a single transaction
    await Promise.all([
      account.save(),
      cashAccount.save(),
      AccountLog.create(accountLogEntry),
      Registry.create(registryEntries),
    ]);
  }

  return account;
};

const handleCashPayment = async (entry) => {
  // Validate entry object
  if (!entry?.party || !entry?.cash || !Array.isArray(entry.cash)) {
    throw createAppError("Invalid entry data", 400, "INVALID_ENTRY");
  }

  // Fetch account
  const account = await AccountType.findOne({ _id: entry.party });
  if (!account) {
    throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  // Process each cash item
  for (const cashItem of entry.cash) {
    // Validate cash item
    if (!cashItem?.cashType || !cashItem?.amount || !cashItem?.currency) {
      throw createAppError("Invalid cash item data", 400, "INVALID_CASH_ITEM");
    }

    const transactionId = await Registry.generateTransactionId();
    const cashAccount = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashAccount) {
      throw createAppError(
        `Cash type account not found for ID: ${cashItem.cashType}`,
        404,
        "CASH_TYPE_NOT_FOUND"
      );
    }

    // Initialize account balances
    account.balances = account.balances || {};
    account.balances.cashBalance = account.balances.cashBalance || {
      currency: cashItem.currency,
      amount: 0,
      lastUpdated: new Date(),
    };

    // Calculate new balances
    const amount = Number(cashItem.amount) || 0;
    if (amount <= 0) {
      throw createAppError("Amount must be positive", 400, "INVALID_AMOUNT");
    }
    const previousBalance = account.balances.cashBalance.amount || 0;
    const balanceAfter = previousBalance - amount;

    // Check for sufficient balance
    // if (balanceAfter < 0) {
    //   throw createAppError(
    //     `Insufficient balance for payment of ${amount} ${cashItem.currency}`,
    //     400,
    //     "INSUFFICIENT_BALANCE"
    //   );
    // }

    // Update balances
    account.balances.cashBalance.amount = balanceAfter;
    account.balances.cashBalance.lastUpdated = new Date();
    cashAccount.openingBalance = (cashAccount.openingBalance || 0) - amount;

    // Create registry entries
    const description = cashItem.remarks?.trim() || entry.remarks?.trim() || "Cash payment";
    const registryEntries = [
      {
        transactionId,
        type: "PARTY_CASH_BALANCE",
        description,
        value: amount,
        debit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: entry.party?.toString(),
        isBullion: false,
      },
      {
        transactionId: await Registry.generateTransactionId(),
        type: "CASH",
        description,
        value: amount,
        credit: amount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: true,
      },
    ];

    // 👉 If VAT exists, add extra registry entry
    if (cashItem.vatAmount && cashItem.vatAmount > 0) {
      registryEntries.push({
        transactionId: await Registry.generateTransactionId(),
        type: "VAT_AMOUNT",
        description: `VAT on cash payment`,
        value: cashItem.vatAmount,
        credit: cashItem.vatAmount,
        reference: entry.voucherCode || "",
        createdBy: entry.enteredBy,
        party: null,
        isBullion: false,
      });
    }


    // Create account log entry
    const accountLogEntry = {
      accountId: cashItem.cashType,
      transactionType: "withdrawal",
      amount,
      balanceAfter: cashAccount.openingBalance,
      note: `Cash payment of ${amount} ${cashItem.currency} for account ${account._id}`,
      action: "subtract",
      transactionId,
      createdBy: entry.enteredBy,
      createdAt: new Date(),
    };

    // Save all changes in a single transaction
    await Promise.all([
      account.save(),
      cashAccount.save(),
      AccountLog.create(accountLogEntry),
      Registry.create(registryEntries),
    ]);
  }

  return account;
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
            transactionType: "metalPayment"
          },
        ],
      },
      true,
      entry.enteredBy,
    );
  }
};

const handleDeleteMetalReceipt = async (entry) => {
  for (const stockItem of entry.stockItems) {
    // Reverse inventory update (subtract, like a payment)
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
            transactionType: "deleteMetalReceipt"
          },
        ],
      },
      true, // subtract
      entry.enteredBy,
    );
  }
};

const handleDeleteMetalPayment = async (entry) => {
  for (const stockItem of entry.stockItems) {
    // Reverse inventory update (add back, like a receipt)
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
            transactionType: "deleteMetalPayment"
          },
        ],
      },
      false, // add
      entry.enteredBy,
    );
  }
};

const handleDeleteCashReceipt = async (entry) => {
  // Fetch account
  const account = await AccountType.findOne({ _id: entry.party });
  if (!account) {
    throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  // Process each cash item to reverse balances
  for (const cashItem of entry.cash) {
    const cashAccount = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashAccount) {
      throw createAppError(
        `Cash type account not found for ID: ${cashItem.cashType}`,
        404,
        "CASH_TYPE_NOT_FOUND"
      );
    }

    const amount = Number(cashItem.amount) || 0;

    // Reverse balances (subtract what was added)
    if (account.balances && account.balances.cashBalance) {
      account.balances.cashBalance.amount -= amount;
      account.balances.cashBalance.lastUpdated = new Date();
    }
    cashAccount.openingBalance = (cashAccount.openingBalance || 0) - amount;

    // Save changes
    await Promise.all([
      account.save(),
      cashAccount.save(),
    ]);
  }
};

const handleDeleteCashPayment = async (entry) => {
  // Fetch account
  const account = await AccountType.findOne({ _id: entry.party });
  if (!account) {
    throw createAppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  // Process each cash item to reverse balances
  for (const cashItem of entry.cash) {
    const cashAccount = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashAccount) {
      throw createAppError(
        `Cash type account not found for ID: ${cashItem.cashType}`,
        404,
        "CASH_TYPE_NOT_FOUND"
      );
    }

    const amount = Number(cashItem.amount) || 0;

    // Reverse balances (add back what was subtracted)
    if (account.balances && account.balances.cashBalance) {
      account.balances.cashBalance.amount += amount;
      account.balances.cashBalance.lastUpdated = new Date();
    }
    cashAccount.openingBalance = (cashAccount.openingBalance || 0) + amount;

    // Save changes
    await Promise.all([
      account.save(),
      cashAccount.save(),
    ]);
  }
};

const getEntriesByType = async (type) => {
  return Entry.find({ type })
    .populate("voucherId")
    .populate("party")
    .populate("enteredBy")
    .populate("stockItems.stock")
    .populate("cash.cashType")
    .populate("cash.currency")
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
      .populate("stockItems.stock")
      .populate("cash.cashType")
      .populate("cash.currency")
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

const deleteEntryById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    // Delete related registry entries
    await RegistryService.deleteRegistryByVoucher(entry.voucherCode);

    // Handle reverse operations based on entry type
    const deleteHandlers = {
      "metal-receipt": handleDeleteMetalReceipt,
      "metal-payment": handleDeleteMetalPayment,
      "cash receipt": handleDeleteCashReceipt,
      "cash payment": handleDeleteCashPayment,
    };

    if (deleteHandlers[entry.type]) {
      await deleteHandlers[entry.type](entry);
    }

    // Delete related account logs
    await AccountLog.deleteMany({ reference: entry.voucherCode });

    // Delete the entry itself
    await entry.deleteOne();

    res.json({ success: true, message: "Entry deleted successfully" });
  } catch (err) {
    console.error("Error deleting entry:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete entry",
      error: err.message,
    });
  }
};

export default {
  editEntry,
  createEntry,
  getCashPayments,
  getCashReceipts,
  getMetalPayments,
  getMetalReceipts,
  getEntryById,
  deleteEntryById
};