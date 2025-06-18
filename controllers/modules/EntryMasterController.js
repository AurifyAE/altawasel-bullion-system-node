import Entry from '../../models/modules/EntryModel.js';
import Registry from '../../models/modules/Registry.js';
import TradeDebtor from '../../models/modules/TradeDebtors.js';
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
    await entry.save();

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
  
  // Find TradeDebtor
  const tradeDebtor = await TradeDebtor.findOne({ _id: entry.party });
  if (!tradeDebtor) {
    throw new Error("Trade debtor not found");
  }
  
  // console.log(`TradeDebtor found: ${tradeDebtor._id}`);
  
  // Process each cash item
  for (const cashItem of entry.cash) {
    const transactionId = await Registry.generateTransactionId();
    
    // Find and validate cash type account
    const cashType = await AccountMaster.findOne({ _id: cashItem.cashType });
    if (!cashType) {
      // throw new Error(`Cash type account not found for ID: ${cashItem.cashType}`);
    }
    
    // console.log(`CashType found: ${cashType.name || cashType._id}`);
    
    // Check if balances field exists
    if (!tradeDebtor.balances || !tradeDebtor.balances.cashBalance) {
      throw new Error("Cash balance not found for this trade debtor");
    }
    
    console.log(`trade debtor: ${tradeDebtor}`);
    // Find the currency in cashBalance array
    const currencyBalance = tradeDebtor.balances.cashBalance.find(
      balance => balance.currency.toString() === cashItem.currency.toString()
    );
    
    if (!currencyBalance) {
      throw new Error(`User doesn't have ${cashItem.currency} currency`);
    }
    
    const requestedAmount = cashItem.amount || 0;
    
    // Deduct amount from trade debtor's cash balance
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
  
  // Save trade debtor after all updates
  await tradeDebtor.save();
};

// Helper function for cash payment
const handleCashPayment = async (entry) => {
  console.log('Processing cash payment:', entry);
  
  // Find TradeDebtor
  const tradeDebtor = await TradeDebtor.findOne({ _id: entry.party });
  if (!tradeDebtor) {
    throw new Error("Trade debtor not found");
  }
  
  console.log(`TradeDebtor found: ${tradeDebtor._id}`);
  
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
    if (!tradeDebtor.balances) {
      tradeDebtor.balances = { cashBalance: [] };
    }
    if (!tradeDebtor.balances.cashBalance) {
      tradeDebtor.balances.cashBalance = [];
    }
    
    // Find the currency in cashBalance array
    let currencyBalance = tradeDebtor.balances.cashBalance.find(
      balance => balance.currency.toString() === cashItem.currency.toString()
    );
    
    // If currency doesn't exist, create it
    if (!currencyBalance) {
      currencyBalance = {
        currency: cashItem.currency,
        amount: 0,
        lastUpdated: new Date()
      };
      tradeDebtor.balances.cashBalance.push(currencyBalance);
    }
    
    // Add amount to trade debtor's cash balance
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
  
  // Save trade debtor after all updates
  await tradeDebtor.save();
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