import Registry from "../../models/modules/Registry.js";
import AccountType from "../../models/modules/AccountType.js";
import { createAppError } from "../../utils/errorHandler.js"; // Assuming createAppError is exported from a utility file

class FundTransferService {
  static async accountToAccountTransfer(senderId, receiverId, value, assetType, adminId) {
    try {
      const senderAccount = await AccountType.findById(senderId);
      const receiverAccount = await AccountType.findById(receiverId);
      if (!senderAccount || !receiverAccount) {
        throw createAppError("Sender or receiver account not found", 404, "ACCOUNT_NOT_FOUND");
      }

      if (assetType === "CASH") {
        await handleCashTransfer(senderAccount, receiverAccount, value, adminId);
      }
      if (assetType === "GOLD") {
        await handleGoldTransfer(senderAccount, receiverAccount, value, adminId);
      }
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        throw createAppError(messages.join(", "), 400, "VALIDATION_ERROR");
      }
      throw error;
    }
  }

  static async openingBalanceTransfer(receiverId, value, adminId) {
    try {
        const receiverAccount = await AccountType.findById(receiverId);
        if (!receiverAccount) {
            throw createAppError("Receiver account not found", 404, "ACCOUNT_NOT_FOUND");
        }

        receiverAccount.balances.cashBalance.amount += value;

        const transaction = new Registry({
            transactionId: await Registry.generateTransactionId(),
            type: "PARTY_CASH_BALANCE",
            description: `OPENING BALANCE FOR ${receiverAccount.customerName}`,
            value: value,
            runningBalance: 0,
            previousBalance: 0,
            credit: value,
            reference: `Opening balance for ${receiverAccount.customerName}`,
            createdBy: adminId,
            party: receiverAccount._id,
        });
        const transactionForParty = new Registry({
            transactionId: await Registry.generateTransactionId(),
            type: "OPENING_BALANCE",
            description: `OPENING BALANCE FOR ${receiverAccount.customerName}`,
            value: value,
            runningBalance: 0,
            previousBalance: 0,
            credit: value,
            reference: `Opening balance for ${receiverAccount.customerName}`,
            createdBy: adminId,
            party: receiverAccount._id,
        });
        await receiverAccount.save();
        await transactionForParty.save();
        await transaction.save();
    } catch (error) {
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        throw createAppError(messages.join(", "), 400, "VALIDATION_ERROR");
      }
      throw error;
        
    }
  }
}

async function handleCashTransfer(senderAccount, receiverAccount, value, adminId) {
  if (senderAccount.balances.cashBalance.amount < value) {
    throw createAppError("Insufficient balance in sender's account", 400, "INSUFFICIENT_BALANCE");
  }

  // Deduct from sender's account
  senderAccount.balances.cashBalance.amount -= value;
  receiverAccount.balances.cashBalance.amount += value;

  // Log the transaction in the registry for sender
  const transaction = new Registry({
    transactionId: await Registry.generateTransactionId(),
    type: "PARTY_CASH",
    description: `FUND TRANSFER FROM ${senderAccount.customerName} TO ${receiverAccount.customerName}`,
    value: value,
    runningBalance: 0,
    previousBalance: 0,
    debit: value,
    reference: `Transfer to ${receiverAccount.customerName}`,
    createdBy: adminId,
    party: senderAccount._id,
  });

  // Log the transaction in the registry for receiver
  const receiverTransaction = new Registry({
    transactionId: await Registry.generateTransactionId(),
    type: "PARTY_CASH",
    description: `FUND TRANSFER TO ${receiverAccount.customerName} FROM ${senderAccount.customerName}`,
    value: value,
    runningBalance: 0,
    previousBalance: 0,
    credit: value,
    reference: `Transfer from ${senderAccount.customerName}`,
    createdBy: adminId,
    party: receiverAccount._id,
  });

  await receiverAccount.save();
  await senderAccount.save();
  await transaction.save();
  await receiverTransaction.save();
}

async function handleGoldTransfer(senderAccount, receiverAccount, value, adminId) {
  if (senderAccount.balances.goldBalance.totalGrams < value) {
    throw createAppError("Insufficient balance in sender's account", 400, "INSUFFICIENT_BALANCE");
  }

  // Deduct from sender's account
  senderAccount.balances.goldBalance.totalGrams -= value;
  receiverAccount.balances.goldBalance.totalGrams += value;

  // Log the transaction in the registry for sender
  const transaction = new Registry({
    transactionId: await Registry.generateTransactionId(),
    type: "PARTY_GOLD",
    description: `GOLD TRANSFER FROM ${senderAccount.customerName} TO ${receiverAccount.customerName}`,
    value: value,
    runningBalance: 0,
    previousBalance: 0,
    debit: value,
    reference: `Transfer to ${receiverAccount.customerName}`,
    createdBy: adminId,
    party: senderAccount._id,
  });

  // Log the transaction in the registry for receiver
  const receiverTransaction = new Registry({
    transactionId: await Registry.generateTransactionId(),
    type: "PARTY_GOLD",
    description: `GOLD TRANSFER TO ${receiverAccount.customerName} FROM ${senderAccount.customerName}`,
    value: value,
    runningBalance: 0,
    previousBalance: 0,
    credit: value,
    reference: `Transfer from ${senderAccount.customerName}`,
    createdBy: adminId,
    party: receiverAccount._id,
  });

  await receiverAccount.save();
  await senderAccount.save();
  await transaction.save();
  await receiverTransaction.save();
}

export default FundTransferService;