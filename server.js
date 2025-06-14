import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRouter from "./routes/core/admin/index.js";
import divisionRouter from "./routes/modules/divisionsRoutes.js";
import karatMasterRoutes from "./routes/modules/karatMasterRoutes.js";
import categoryMasterRoutes from "./routes/modules/categoryMasterRoutes.js";
import productMasterRoutes from "./routes/modules/productMasterRoutes.js";
import metalRateMasterRoutes from "./routes/modules/metalRateMasterRoutes.js";
import currencyMasterRoutes from "./routes/modules/currencyMasterRoutes.js";
import tradeDebtorsRoutes from "./routes/modules/tradeDebtorsRoutes.js";
import metalStockRoutes from "./routes/modules/metalStockRoutes.js";
import costCenterMasterRoutes from "./routes/modules/costCenterMasterRoutes.js";
import metalPurchaseRoutes from "./routes/modules/MetalPurchaseRoutes.js";
import RegistryRouter from "./routes/modules/RegistryRouter.js"
import VoucherRoute from "./routes/modules/VoucherMasterRoute.js"


import { mongodb } from "./config/db.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;

app.use(express.static("public"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true })); // Increase URL-encoded payload limit

// CORS configuration - BEFORE other middleware
const corsOptions = {
  // Specify allowed origins explicitly instead of using wildcard when credentials are enabled
  origin: function (origin, callback) {
    // Allow any origin to access your API
    // For production, you should list specific domains
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8080",
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Add more origins as needed for your app
      callback(null, true); // Allow all origins for now, change in production
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-secret-key", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS first
app.use(cors(corsOptions));

// Database connecting
mongodb();

// Routes
app.use("/api/v1", adminRouter);
app.use("/api/v1/divisions", divisionRouter);
app.use("/api/v1/karats", karatMasterRoutes);
app.use("/api/v1/category-master", categoryMasterRoutes);
app.use("/api/v1/product-master", productMasterRoutes);
app.use("/api/v1/metal-rates", metalRateMasterRoutes);
app.use("/api/v1/currency-master", currencyMasterRoutes);
app.use("/api/v1/trade-debtors", tradeDebtorsRoutes);
app.use("/api/v1/metal-stocks", metalStockRoutes);
app.use("/api/v1/cost-centers", costCenterMasterRoutes);
app.use("/api/v1/metal-purchases", metalPurchaseRoutes);
app.use("/api/v1/registry", RegistryRouter);
app.use("/api/v1/voucher",VoucherRoute)

// Global error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log("Server running !!!!!");
  console.log(`http://localhost:${port}`);
});
