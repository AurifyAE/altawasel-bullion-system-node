import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, "Entry type is required"]
    },
    voucherId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "VoucherMaster"
    },
    voucherCode:{
        type: String,
    },
    voucherDate:{
        type: Date
    },
    branch:{
        type: mongoose.Schema.Types.ObjectId, // this is set as null the ref need to check in the time of branch creation
        // ref: "Branch",
        default: null
    },
    cashType:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccountMaster",
        default: null
    },
    amount: {
        type: Number,
        default: 0,
    },
    amountWithTnr:{
        type: Number,
        default: 0,
    },
    party:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TradeDebtors",
        default: null
    },
    enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },
    remarks: {
        type: String,
    },
    stocks: [{
        stock: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MetalStock",
        },
        grossWeight: {
            type: Number,
            required: [true, "Gross weight is required"]
        },
        purity: {
            type: Number,
            required: [true, "Purity is required"]
        },
        purityWeight: {
            type: Number,
            required: [true, "Purity weight is required"]
        },
        netWeight: {
            type: Number,
            required: [true, "Net weight is required"]
        },
        ozWeight: {
            type: Number,
            required: [true, "Oz weight is required"]
        },
        grossWeight: {
            type: Number,
            required: [true, "Gross weight is required"]
        },
        remarks: {
            type: String,
        },
    }]
}, {
    timestamps: true
});

const Entry = mongoose.model('Entry', entrySchema);

export default Entry;