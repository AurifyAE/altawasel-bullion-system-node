import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
    {
        metal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MetalStock",
            required: [true, "Metal reference is required"],
        },
        pcs: {
            type: Boolean,
            default: false,
        },
        pcsCount: {
            type: Number,
            default: 0,
            validate: {
                validator: function (value) {
                    return !this.pcs || Number.isInteger(value);
                },
                message: "pcsCount must be a non-negative integer when pcs is true",
            },
        },
        grossWeight: {
            type: Number,
            default: 0,
            min: [0, "Gross weight cannot be negative"],
        },
        pureWeight: {
            type: Number,
            default: 0,
            min: [0, "Pure weight cannot be negative"],
        },
        purity: {
            type: Number,
        },
        status: {
            type: String,
            enum: ["active", "sold", "reserved", "damaged"],
            default: "active",
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// === Indexes for fast search ===
InventorySchema.index({ metal: 1 });
InventorySchema.index({ status: 1 });
InventorySchema.index({ pcs: 1 });
InventorySchema.index({ createdAt: -1 });

const Inventory = mongoose.model("Inventory", InventorySchema);

export default Inventory;
