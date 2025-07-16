import Entry from "../../models/modules/EntryModel.js";
import Registry from "../../models/modules/Registry.js";
import AccountType from "../../models/modules/AccountType.js"; // Make sure this is at the top
import AccountMaster from "../../models/modules/accountMaster.js";
import InventoryService from "../../services/modules/inventoryService.js";

const createEntry = async (req, res) => {
  try {
    const { type } = req.body;

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
        message: "Invalid entry type",
      });
    }

    // Prepare entry data based on type
    let entryData = {
      // voucherId: req.body.voucherId,
      type: req.body.type,
      voucherCode: req.body.voucherCode,
      voucherDate: req.body.voucherDate,
      party: req.body.party,
      enteredBy: req.admin.id,
      remarks: req.body.remarks,
    };

    // Add type-specific fields
    if (type === "metal-receipt" || type === "metal-payment") {
      entryData.stocks = req.body.stocks;
    } else if (type === "cash receipt" || type === "cash payment") {
      entryData.cash = req.body.cash;
    }

    const entry = new Entry(entryData);

    // Handle metal-receipt
    if (type === "metal-receipt") {
      await handleMetalReceipt(entry);
    }

    // Handle cash receipt
    if (type === "cash receipt") {
      await handleCashReceipt(entry);
    }

    // Handle cash payment
    if (type === "cash payment") {
      await handleCashPayment(entry);
    }

    // Handle metal-payment
    if (type === "metal-payment") {
      await handleMetalPayment(entry);
    }

    // Save entry only after all handlers succeed
    await entry.save();

    res.status(201).json({
      success: true,
      data: entry,
      message: `${type} entry created successfully`,
    });
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// Helper function for metal-receipt
const handleMetalReceipt = async (entry) => {
  console.log('====================================');
  console.log(entry);
  console.log('====================================');
  for (const stock of entry.stocks) {
    const transactionId = await Registry.generateTransactionId();
    console.log('====================================');
    console.log(stock);
    console.log('====================================');
    // Use consistent description logic
    const description =
      stock.remarks && stock.remarks.trim() !== ""
        ? stock.remarks
        : "metal-receipt transaction";

    // Registry entry for "stock balance"
    await Registry.create({
      transactionId,
      type: "GOLD_STOCK",
      description, // Use the computed description
      value: stock.grossWeight,
      runningBalance: 0,
      previousBalance: 0,
      credit: stock.grossWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
      purity: stock.purity,
      grossWeight: stock.grossWeight,
      pureWeight: stock.purityWeight
    });
    console.log(`Created stock balance entry for stock: ${stock.stock}`);

    // Registry entry for "gold"
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "GOLD",
      description, // Use the same computed description
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      debit: stock.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });
    console.log(`Created gold entry for stock: ${stock.stock}`);
  }
  const transaction = {
    stockItems: entry.stocks.map((stock) => ({
      stockCode: { _id: stock.stock, code: stock.stock.toString() }, // Assuming stock.stock is the ObjectId
      pieces: 0, // Adjust if pieces are relevant; not provided in sample data
      grossWeight: stock.grossWeight,
      purity: stock.purity,
    })),
  };

  // Determine if it's a sale (metal-payment) or receipt (metal-receipt)
  const isSale = entry.type === "metal-payment";

  // Update inventory
  await InventoryService.updateInventory(transaction, isSale);
};

// Helper function for cash receipt
const handleCashReceipt = async (entry) => {
  // Find AccountType
  const accountType = await AccountType.findOne({ _id: entry.party });
  console.log("Fetched accountType:", accountType);
  if (!accountType) {
    throw new Error("Account not found");
  }

  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();

    // Find and validate cash type account
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    console.log("Fetched cashType:", cashType);
    if (!cashType) {
      // throw new Error(`Cash type account not found for ID: ${cashItem.cashType}`);
    }

    // Ensure balances and cashBalance object exist
    if (!accountType.balances) {
      accountType.balances = {};
    }
    if (
      !accountType.balances.cashBalance ||
      typeof accountType.balances.cashBalance !== "object"
    ) {
      accountType.balances.cashBalance = {
        currency: cashItem.currency || null,
        amount: 0,
        lastUpdated: new Date(),
      };
      console.log("Initialized accountType.balances.cashBalance as object");
    }

    const requestedAmount = cashItem.amount || 0;

    // Add amount to account cash balance (RECEIPT)
    console.log("Before:", {
      amount: accountType.balances.cashBalance.amount,
      requestedAmount,
      typeofRequestedAmount: typeof requestedAmount,
    });

    accountType.balances.cashBalance.amount += requestedAmount;

    console.log("After:", {
      amount: accountType.balances.cashBalance.amount,
    });

    accountType.balances.cashBalance.lastUpdated = new Date();

    // Deduct amount from cash type opening balance
    cashType.openingBalance = (cashType.openingBalance || 0) + requestedAmount;
    await cashType.save();
    await accountType.save();

    // Registry entry for "cash balance"
    await Registry.create({
      transactionId,
      type: "PARTY_CASH_BALANCE",
      description:
        cashItem.remarks && cashItem.remarks.trim() !== ""
          ? cashItem.remarks
          : entry.remarks && entry.remarks.trim() !== ""
            ? entry.remarks
            : "No description",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      credit: requestedAmount,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
      isBullion: false,
    });
    console.log(`Created cash balance entry for cashType: ${cashType._id}`);

    // Registry entry for "cash"
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "CASH",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      debit: requestedAmount,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });
    console.log(`Created cash entry for cashType: ${cashType._id}`);
  }
};

// Helper function for cash payment
const handleCashPayment = async (entry) => {
  console.log("Processing cash payment:", JSON.stringify(entry, null, 2));

  const accountType = await AccountType.findOne({ _id: entry.party });
  if (!accountType) {
    throw new Error("Account not found");
  }

  console.log(
    "Fetched accountType.balances:",
    JSON.stringify(accountType.balances, null, 2)
  );

  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();

    console.log("Processing cashItem:", JSON.stringify(cashItem, null, 2));
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashType) {
      throw new Error(
        `Cash type account not found in admin for ID: ${cashItem.cashType}`
      );
    }

    console.log(`CashType found: ${cashType.name || cashType._id}`);

    const requestedAmount = cashItem.amount || 0;
    console.log(`Requested amount: ${requestedAmount}`);

    // Ensure balances and cashBalance array exist
    if (!accountType.balances) {
      accountType.balances = { cashBalance: [] };
      console.log("Initialized accountType.balances");
    }
    if (
      !accountType.balances.cashBalance ||
      typeof accountType.balances.cashBalance !== "object"
    ) {
      accountType.balances.cashBalance = {
        currency: cashItem.currency || null,
        amount: 0,
        lastUpdated: new Date(),
      };
      console.log("Initialized accountType.balances.cashBalance as object");
    }

    // Update the cash balance object directly
    accountType.balances.cashBalance.amount -= requestedAmount;
    accountType.balances.cashBalance.lastUpdated = new Date();

    // Debug: Log cashBalance array after update
    console.log(
      "After update, cashBalance:",
      JSON.stringify(accountType.balances.cashBalance, null, 2)
    );

    cashType.openingBalance = (cashType.openingBalance || 0) - requestedAmount;
    await cashType.save();

    await Registry.create({
      transactionId,
      type: "PARTY_CASH_BALANCE",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      debit: requestedAmount,
      reference: entry.voucherCode,
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
      isBullion: false,
    });
    console.log(`Created cash balance entry for cashType: ${cashType._id}`);

    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "CASH",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      credit: requestedAmount,
      reference: entry.voucherCode,
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });
    console.log(`Created cash entry for cashType: ${cashType._id}`);
  }

  // Save account after all updates
  await accountType.save();
};

// Helper function for metal-payment
const handleMetalPayment = async (entry) => {
  console.log("====================================");
  console.log(entry);
  console.log("====================================");

  for (const stock of entry.stocks) {
    const transactionId = await Registry.generateTransactionId();
    const description =
      stock.remarks && stock.remarks.trim() !== ""
        ? stock.remarks
        : "metal-payment transaction";

    // Registry entry for "stock balance" (debit for payment)
    await Registry.create({
      transactionId,
      type: "GOLD_STOCK",
      description,
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      debit: stock.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
      purity: stock.purity,
      grossWeight: stock.purityWeight,
      pureWeight: stock.purityWeight
    });
    console.log(`Created stock balance entry for stock: ${stock.stock}`);

    // Registry entry for "gold" (credit for payment)
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "GOLD",
      description,
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      credit: stock.purityWeight,
      reference: entry.voucherCode || "",
      createdBy: entry.enteredBy,
      party: null,
      isBullion: true,
    });
    console.log(`Created gold entry for stock: ${stock.stock}`);
  }

  // Prepare transaction data for inventory update
  const transaction = {
    stockItems: entry.stocks.map((stock) => ({
      stockCode: { _id: stock.stock, code: stock.stock.toString() }, // Assuming stock.stock is the ObjectId
      pieces: 0, // Adjust if pieces are relevant; not provided in sample data
      grossWeight: stock.grossWeight,
      purity: stock.purity,
    })),
  };

  // Determine if it's a sale (metal-payment) or receipt (metal-receipt)
  const isSale = entry.type === "metal-payment";

  // Update inventory
  await InventoryService.updateInventory(transaction, isSale);
};

const getCashPayments = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "cash payment" })
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stocks.stock")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCashReceipts = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "cash receipt" })
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stocks.stock")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err); // Add this line
    res.status(500).json({ error: err.message });
  }
};

const getMetalPayments = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "metal-payment" })
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stocks.stock")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMetalReceipts = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "metal-receipt" })
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stocks.stock")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEntryById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id)
      .populate("voucherId")
      .populate("party")
      .populate("enteredBy")
      .populate("stocks.stock");
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
