// models/Voucher.js
import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true },
  voucherType: { type: String },
  module: { type: String },
  // Add other fields as needed (e.g., date, partyCode, etc.)
}, { timestamps: true });

// Index for faster queries on voucherNumber
voucherSchema.index({ voucherNumber: 1 });

export default mongoose.model('Vouchers', voucherSchema);