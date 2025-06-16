import Entry from '../../models/modules/EntryModel.js';
import Registry from '../../models/modules/Registry.js';

const createEntry = async (req, res) => {
  try {
    const { type } = req.body;
    const entry = new Entry(req.body);
    await entry.save();

    if (type === "metal receipt") {
      for (const stock of entry.stocks) {
        const transactionId = await Registry.generateTransactionId();

        // Registry entry for "stock balance"
        await Registry.create({
          transactionId,
          type: "stock balance",
          description: stock.remarks || "",
          value: stock.purityWeight,
          runningBalance: 0,
          previousBalance: 0,
          debit: stock.purityWeight,
          reference: stock.stock ? stock.stock.toString() : "",
          createdBy: entry.enteredBy,
        });
        console.log(`Created stock balance entry for stock: ${stock.stock}`);

        // Registry entry for "gold"
        await Registry.create({
          transactionId: await Registry.generateTransactionId(),
          type: "gold",
          description: stock.remarks || "",
          value: stock.purityWeight,
          runningBalance: 0,
          previousBalance: 0,
          credit: stock.purityWeight,
          reference: stock.stock ? stock.stock.toString() : "",
          createdBy: entry.enteredBy,
        });
        console.log(`Created gold entry for stock: ${stock.stock}`);
      }
    }

    // For "cash receipt", you can add Registry logic here if needed

    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


const getAllEntries = async (req, res) => {
  try {
    const entries = await Entry.find()
      .populate('voucherId')
      .populate('party')
      .populate('enteredBy')
      .populate('stocks.stock')
      .sort({ createdAt: -1 }); // latest first
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
  getAllEntries,
  getEntryById
};