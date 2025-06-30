import FundTransferService from "../../services/modules/FundTransferService.js";
// Named export
export const accountToAccountTransfer = async (req, res, next) => {
  try {
    const { senderId, receiverId, value, assetType } = req.body;
    const adminId = req.admin.id;

    if (!senderId || !receiverId || !value || !assetType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await FundTransferService.accountToAccountTransfer(senderId, receiverId, value, assetType, adminId);
    
    res.status(200).json({ message: "Fund transfer successful" });
  } catch (error) {
    next(error);
  }
};