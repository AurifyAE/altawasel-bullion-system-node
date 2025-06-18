import Entry from '../../models/modules/EntryModel.js';
import Registry from '../../models/modules/Registry.js';
import AccountType from '../../models/modules/AccountType.js';
import AccountMaster from '../../models/modules/accountMaster.js';


const createEntry = async (req, res) => {
  try {
    const { type } = req.body;

    // Validate entry type
    const validTypes = ["metal receipt", "metal payment", "cash receipt", "cash payment"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry type"
      });
    }

    // Prepare entry data based on type
    let entryData = {
      voucherId: req.body.voucherId,
      type: req.body.type,
      voucherCode: req.body.voucherCode,
      voucherDate: req.body.voucherDate,
      party: req.body.party,
      enteredBy: req.body.enteredBy,
      remarks: req.body.remarks
    };

    // Add type-specific fields
    if (type === "metal receipt" || type === "metal payment") {
      entryData.stocks = req.body.stocks;
    } else if (type === "cash receipt" || type === "cash payment") {
      entryData.cash = req.body.cash;
    }

    const entry = new Entry(entryData);

    // Handle metal receipt
    if (type === "metal receipt") {
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

    // Handle metal payment
    if (type === "metal payment") {
      await handleMetalPayment(entry);
    }

    // Save entry only after all handlers succeed
    await entry.save();

    res.status(201).json({
      success: true,
      data: entry,
      message: `${type} entry created successfully`
    });
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Helper function for metal receipt
const handleMetalReceipt = async (entry) => {
  for (const stock of entry.stocks) {
    const transactionId = await Registry.generateTransactionId();

    // Registry entry for "stock balance"
    await Registry.create({
      transactionId,
      type: "STOCK_BALANCE",
      description: stock.remarks || "",
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      credit: stock.purityWeight,
      reference: stock.stock ? stock.stock.toString() : "",
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created stock balance entry for stock: ${stock.stock}`);

    // Registry entry for "gold"
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "GOLD",
      description: stock.remarks || "",
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      debit: stock.purityWeight,
      reference: stock.stock ? stock.stock.toString() : "",
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created gold entry for stock: ${stock.stock}`);
  }
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

    // Check if balances field exists
    console.log("accountType.balances:", accountType.balances);
    if (!accountType.balances || !accountType.balances.cashBalance) {
      throw new Error("Cash balance not found for this account");
    }

    // Find the currency in cashBalance array
    const currencyBalance = accountType.balances.cashBalance.find(
      balance => balance.currency.toString() === cashItem.currency.toString()
    );
    console.log("currencyBalance:", currencyBalance);

    if (!currencyBalance) {
      throw new Error(`User doesn't have the selected currency`);
      res.status(400).json({ success: false, error: `User doesn't have the selected currency` });
    }

    const requestedAmount = cashItem.amount || 0;

    // Deduct amount from account cash balance
    currencyBalance.amount -= requestedAmount;
    currencyBalance.lastUpdated = new Date();

    // Add amount to cash type opening balance
    cashType.openingBalance = (cashType.openingBalance || 0) + requestedAmount;
    await cashType.save();

    // Registry entry for "cash balance"
    await Registry.create({
      transactionId,
      type: "PARTY_CASH_BALANCE",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      credit: requestedAmount,
      reference: entry._id.toString(),
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
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
      reference: entry._id.toString(),
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created cash entry for cashType: ${cashType._id}`);
  }

  // Save account after all updates
  await accountType.save();
};

// Helper function for cash payment
const handleCashPayment = async (entry) => {
  console.log('Processing cash payment:', entry);
  
  // Find AccountType
  const AccountType = await AccountType.findOne({ _id: entry.party });
  if (!AccountType) {
    throw new Error("Account not found");
  }
  
  console.log(`AccountType found: ${AccountType._id}`);
  
  // Process each cash item
  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();
    
    // Find and validate cash type account
    console.log(cashItem.cashType,"this is cash type");
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashType) {
      throw new Error(`Cash type account not found for ID: ${cashItem.cashType}`);
    }
    
    console.log(`CashType found: ${cashType.name || cashType._id}`);
    
    const requestedAmount = cashItem.amount || 0;
    
    // Allow negative balances - no balance check needed
    
    // Check if balances field exists, if not create it
    if (!AccountType.balances) {
      AccountType.balances = { cashBalance: [] };
    }
    if (!AccountType.balances.cashBalance) {
      AccountType.balances.cashBalance = [];
    }
    
    // Find the currency in cashBalance array
    let currencyBalance = AccountType.balances.cashBalance.find(
      balance => balance.currency.toString() === cashItem.currency.toString()
    );
    
    // If currency doesn't exist, create it
    if (!currencyBalance) {
      currencyBalance = {
        currency: cashItem.currency,
        amount: 0,
        lastUpdated: new Date()
      };
      AccountType.balances.cashBalance.push(currencyBalance);
    }
    
    // Add amount to account's cash balance
    currencyBalance.amount += requestedAmount;
    currencyBalance.lastUpdated = new Date();
    
    // Deduct amount from cash type opening balance
    cashType.openingBalance = (cashType.openingBalance || 0) - requestedAmount;
    await cashType.save();
    
    // Registry entry for "cash balance" (debit for payment)
    await Registry.create({
      transactionId,
      type: "PARTY_CASH_BALANCE",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      debit: requestedAmount,
      reference: entry._id.toString(),
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created cash balance entry for cashType: ${cashType._id}`);

    // Registry entry for "cash" (credit for payment)
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "CASH",
      description: cashItem.remarks || entry.remarks || "",
      value: requestedAmount,
      runningBalance: 0,
      previousBalance: 0,
      credit: requestedAmount,
      reference: entry._id.toString(),
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created cash entry for cashType: ${cashType._id}`);
  }
  
  // Save account after all updates
  await AccountType.save();
};

// Helper function for metal payment
const handleMetalPayment = async (entry) => {
  for (const stock of entry.stocks) {
    const transactionId = await Registry.generateTransactionId();

    // Registry entry for "stock balance" (debit for payment)
    await Registry.create({
      transactionId,
      type: "STOCK_BALANCE",
      description: stock.remarks || "",
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      debit: stock.purityWeight,
      reference: stock.stock ? stock.stock.toString() : "",
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created stock balance entry for stock: ${stock.stock}`);

    // Registry entry for "gold" (credit for payment)
    await Registry.create({
      transactionId: await Registry.generateTransactionId(),
      type: "GOLD",
      description: stock.remarks || "",
      value: stock.purityWeight,
      runningBalance: 0,
      previousBalance: 0,
      credit: stock.purityWeight,
      reference: stock.stock ? stock.stock.toString() : "",
      createdBy: entry.enteredBy,
      party: entry.party ? entry.party.toString() : null,
    });
    console.log(`Created gold entry for stock: ${stock.stock}`);
  }
};


const getCashPayments = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "cash payment" })
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCashReceipts = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "cash receipt" })
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err); // Add this line
    res.status(500).json({ error: err.message });
  }
};

const getMetalPayments = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "metal payment" })
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMetalReceipts = async (req, res) => {
  try {
    const entries = await Entry.find({ type: "metal receipt" })
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEntryById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id)
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock');
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
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
  getEntryById
};