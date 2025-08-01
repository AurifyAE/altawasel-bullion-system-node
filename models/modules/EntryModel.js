import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, "Entry type is required"],
        enum: ["metal-receipt", "metal-payment", "cash receipt", "cash payment", "currency-receipt"]
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VoucherMaster"
    },
    voucherCode: {
        type: String,
    },
    voucherDate: {
        type: Date
    },
    party: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
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

    // Total amount field (calculated from cash array)
    totalAmount: {
        type: Number,
        default: 0,
    },

    // Aggregate fields for metal entries (sum of stocks array)
    totalGrossWeight: {
        type: Number,
        default: 0,
    },
    totalPurityWeight: {
        type: Number,
        default: 0,
    },
    totalNetWeight: {
        type: Number,
        default: 0,
    },
    totalOzWeight: {
        type: Number,
        default: 0,
    },

    // Metal stocks array for metal-receipt/payment
    stockItems: [{
        stock: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MetalStock",
        },
        grossWeight: {
            type: Number,
            required: function () {
                return this.parent().type === "metal-receipt" || this.parent().type === "metal-payment";
            }
        },
        purity: {
            type: Number,
            required: function () {
                return this.parent().type === "metal-receipt" || this.parent().type === "metal-payment";
            }
        },
        purityWeight: {
            type: Number,
            required: function () {
                return this.parent().type === "metal-receipt" || this.parent().type === "metal-payment";
            }
        },
        netWeight: {
            type: Number,
            required: function () {
                return this.parent().type === "metal-receipt" || this.parent().type === "metal-payment";
            }
        },
        ozWeight: {
            type: Number,
            required: function () {
                return this.parent().type === "metal-receipt" || this.parent().type === "metal-payment";
            }
        },
        remarks: {
            type: String,
        },
    }],

    // Cash array for cash receipt/payment
    cash: [{
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            // ref: "Branch", // Uncomment when branch model is ready
            default: null
        },
        cashType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AccountMaster",
            required: function () {
                return this.parent().type === "cash receipt" || this.parent().type === "cash payment";
            }
        },
        currency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Currency", // Assuming you have a Currency model
            required: function () {
                return this.parent().type === "cash receipt" || this.parent().type === "cash payment";
            }
        },
        amount: {
            type: Number,
            required: function () {
                return this.parent().type === "cash receipt" || this.parent().type === "cash payment";
            },
            min: [0, "Amount must be positive"]
        },
        amountWithTnr: {
            type: Number,
            default: 0,
        },
        remarks: {
            type: String,
        },
    }]
}, {
    timestamps: true
});

// Pre-save middleware to calculate totals
entrySchema.pre('save', function (next) {
    // Calculate totals for metal entries
    if (this.type === "metal-receipt" || this.type === "metal-payment") {
        if (this.stocks && this.stocks.length > 0) {
            this.totalGrossWeight = this.stocks.reduce((sum, stock) => sum + (stock.grossWeight || 0), 0);
            this.totalPurityWeight = this.stocks.reduce((sum, stock) => sum + (stock.purityWeight || 0), 0);
            this.totalNetWeight = this.stocks.reduce((sum, stock) => sum + (stock.netWeight || 0), 0);
            this.totalOzWeight = this.stocks.reduce((sum, stock) => sum + (stock.ozWeight || 0), 0);
        } else {
            // Reset totals if no stocks
            this.totalGrossWeight = 0;
            this.totalPurityWeight = 0;
            this.totalNetWeight = 0;
            this.totalOzWeight = 0;
        }
    }

    // Calculate total amount for cash entries
    if (this.type === "cash receipt" || this.type === "cash payment") {
        if (this.cash && this.cash.length > 0) {
            this.totalAmount = this.cash.reduce((sum, cashItem) => sum + (cashItem.amount || 0), 0);
        } else {
            this.totalAmount = 0;
        }
    }

    next();
});

// Index for better query performance
entrySchema.index({ type: 1, voucherDate: -1 });
entrySchema.index({ party: 1, createdAt: -1 });
entrySchema.index({ enteredBy: 1, createdAt: -1 });

const Entry = mongoose.model('Entry', entrySchema);

export default Entry;