import mongoose from "mongoose";
import Inventory from "../../models/modules/inventory.js";
import Registry from "../../models/modules/Registry.js";
import { createAppError } from "../../utils/errorHandler.js";
import MetalStock from "../../models/modules/MetalStock.js";

class InventoryService {
    static async fetchAllInventory() {
        try {
            return await Inventory.find()
                .populate([
                    {
                        path: "metal",
                        populate: [
                            { path: "karat" },
                            { path: "metalType" }
                        ]
                    },
                    { path: "createdBy" }
                ])
                .sort({ createdAt: -1 });
        } catch (err) {
            throw createAppError("Failed to fetch inventory logs", 500, "FETCH_ERROR");
        }
    }


    static async addInitialInventory(metal, createdBy) {
        try {
            const inventory = new Inventory({
                metal: metal._id,
                pcs: metal.pcs,
                pcsCount: metal.pcsCount,
                grossWeight: 0,
                pureWeight: 0,
                purity: metal.karat?.standardPurity || 0,
                status: "active",
                isActive: true,
                createdBy,
            });
            return await inventory.save();
        } catch (error) {
            throw createAppError("Error while saving to database", 500, "DATABASE_ERROR");
        }
    }

    static async updateInventoryByFrontendInput({ metalId, type, value, adminId }) {
        try {
            if (!metalId || !type || value === undefined) {
                throw createAppError("Missing metalId, type, or value", 400, "MISSING_INPUT");
            }

            const inventory = await Inventory.findOne({ metal: new mongoose.Types.ObjectId(metalId) });
            if (!inventory) {
                throw createAppError(`Inventory not found for metal ID: ${metalId}`, 404, "INVENTORY_NOT_FOUND");
            }
            const metal = await MetalStock.findById(metalId);
            if (!metal) {
                throw createAppError(`Metal not found for ID: ${metalId}`, 404, "METAL_NOT_FOUND");
            }

            const qty = Number(value);
            if (isNaN(qty)) {
                throw createAppError("Provided value must be a number", 400, "INVALID_VALUE");
            }
            let description = "";
            let registryValue = 0;
            const isAddition = qty > 0;

            if (type === "pcs") {
                if (!Number.isInteger(qty) || qty < 0) {
                    throw createAppError("Piece count is required and must be a non-negative integer for piece-based stock", 400, "INVALID_PCS_COUNT");
                }
                inventory.pcsCount += qty;
                description = `Inventory ${isAddition ? 'added' : 'removed'}: ${metal.code} - ${Math.abs(qty)} pieces`;
                registryValue = Math.abs(qty) * (metal.pricePerPiece || 0);

            } else if (type === "grams") {
                if (qty < 0) {
                    throw createAppError("Weight value must be a non-negative number", 400, "INVALID_GRAM_VALUE");
                }
                inventory.grossWeight += qty;
                inventory.pureWeight = (inventory.grossWeight * inventory.purity) / 100;
                description = `Inventory ${isAddition ? 'added' : 'removed'}: ${metal.code} - ${Math.abs(qty)} grams`;
                registryValue = Math.abs(qty) * (metal.pricePerGram || 0);
            } else {
                throw createAppError("Invalid type. Use 'pcs' or 'grams'", 400, "INVALID_TYPE");
            }
            const savedInventory = await inventory.save();

            await this.createRegistryEntry({
                transactionId: await Registry.generateTransactionId(),
                type: "OPENING_STOCK_BALANCE",
                description: `OPENING STOCK FOR ${metal.code}`,
                value: value,
                credit: 0,
                reference: metal.code,
                createdBy: adminId
            });
            return savedInventory
        } catch (error) {
            if (error.name === "AppError") throw error;
            throw createAppError(error.message || "Inventory update failed", 500, "INVENTORY_UPDATE_ERROR");
        }
    }

    static async updateInventory(transaction, isSale = false) {
        try {
            const updated = [];

            for (const item of transaction.stockItems || []) {
                const metalId = item.stockCode?._id;


                if (!metalId) continue;

                const inventory = await Inventory.findOne({ metal: new mongoose.Types.ObjectId(metalId) });
                const metal = await MetalStock.findById(metalId)
                if (!inventory) {
                    throw createAppError(`Inventory not found for metal: ${item.stockCode.code}`, 404, "INVENTORY_NOT_FOUND");
                }

                const factor = isSale ? -1 : 1;
                const pcsDelta = factor * (item.pieces || 0);
                const weightDelta = factor * (item.grossWeight || 0);

                // Pre-check to prevent negative values
                if (inventory.pcsCount + pcsDelta < 0 || inventory.grossWeight + weightDelta < 0) {
                    throw createAppError(`Insufficient stock for metal: ${item.stockCode.code}`, 400, "INSUFFICIENT_STOCK");
                }

                inventory.pcsCount += pcsDelta;
                inventory.grossWeight += weightDelta;
                inventory.pureWeight = (inventory.grossWeight * inventory.purity) / 100;

                await inventory.save();
                updated.push(inventory);
            }

            return updated;
        } catch (error) {
            if (error.name === "AppError") throw error;
            throw createAppError(error.message || "Failed to update inventory", 500, "INVENTORY_UPDATE_FAILED");
        }
    }
    static async createRegistryEntry({
        transactionId,
        type,
        description,
        value,
        debit = 0,
        credit = 0,
        reference = null,
        party = null,
        isBullion = null,
        costCenter = "INVENTORY",
        createdBy
    }) {
        try {

            const registryEntry = new Registry({
                transactionId,
                costCenter,
                type,
                description,
                value,
                debit,
                credit,
                reference,
                party,
                isBullion,
                createdBy,
                status: "completed"
            });

            return await registryEntry.save();
        } catch (error) {
            console.error("Failed to create registry entry:", error);
            // Don't throw error to prevent inventory update from failing
            // Log the error for debugging purposes
        }
    }
}

export default InventoryService;
