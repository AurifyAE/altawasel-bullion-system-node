import FundTransferService from "../../services/modules/FundTransferService.js";
// Named export
export const accountToAccountTransfer = async (req, res, next) => {
  try {
    const { senderId, receiverId, value, assetType, voucher } = req.body;
    const adminId = req.admin.id;

    if (!senderId || !receiverId || !value || !assetType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await FundTransferService.accountToAccountTransfer(senderId, receiverId, value, assetType, adminId , voucher);

    res.status(200).json({ message: "Fund transfer successful" });
  } catch (error) {
    next(error);
  }
};

export const openingBalanceTransfer = async (req, res, next) => {
  try {
    const { receiverId, value, assetType, voucher } = req.body;
    const adminId = req.admin.id;

    if (!receiverId || !value || !assetType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await FundTransferService.openingBalanceTransfer(receiverId, value, adminId, assetType, voucher);

    res.status(200).json({ message: "Opening balance transfer successful" });
  } catch (error) {
    next(error);
  }
};

// get all fund transfers with full population
export const getFundTransfers = async (req, res, next) => {
  try {
    const fundTransfers = await FundTransferService.getFundTransfers();
    res.status(200).json(fundTransfers);
  } catch (error) {
    next(error);
  }
};



