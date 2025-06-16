import AccountMaster from '../../models/modules/accountMaster.js';

// Create a new account
const createAccount = async (req, res) => {
  try {
    const { name, openingBalance } = req.body;
    const account = new AccountMaster({ name, openingBalance });
    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all accounts
const getAccounts = async (req, res) => {
  try {
    const accounts = await AccountMaster.find({ deleted: false });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAccountById = async (req, res) => {
  try {
    const account = await AccountMaster.findOne({ _id: req.params.id, deleted: false });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update account by ID
const updateAccount = async (req, res) => {
  try {
    const { name, openingBalance } = req.body;
    const account = await AccountMaster.findByIdAndUpdate(
      req.params.id,
      { name, openingBalance },
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete account by ID
const deleteAccount = async (req, res) => {
  try {
    const account = await AccountMaster.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ message: 'Account soft deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export default {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount
};