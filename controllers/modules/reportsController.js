import { ReportService } from "../../services/modules/reportService.js";

const reportService = new ReportService();


export const getReports = async (req, res) => {
  try {
    const filters = req.body;
    // Call service to get report data
    const reportData = await reportService.getReportsData(filters);
    // Return success response (even if no data found)
    res.status(200).json({
      success: true,
      message: reportData.totalRecords > 0
        ? `Metal stock ledger report generated successfully with ${reportData.totalRecords} records`
        : "No transactions found for the specified criteria",
      data: reportData.data,
      totalRecords: reportData.totalRecords,
      filters: reportData.filters
    });

  } catch (error) {
    console.error("Error in getMetalStockLedgerReport:", error);

    // Handle specific error types
    if (error.message.includes("From date cannot be greater than to date")) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range: From date cannot be greater than to date",
        error: "INVALID_DATE_RANGE"
      });
    }

    if (error.message.includes("From date and to date are required")) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Internal server error while generating report",
      error: error.message
    });
  }
};


export const getStockMovement = async (req, res) => {
  try {
    const filters = req.body;
    // Call service to get report data
    const reportData = await reportService.getStockMovementReport(filters);
    // Return success response (even if no data found)
    res.status(200).json({
      success: true,
      message: reportData.totalRecords > 0
        ? `Metal stock ledger report generated successfully with ${reportData.totalRecords} records`
        : "No transactions found for the specified criteria",
      data: reportData.data,
      totalRecords: reportData.totalRecords,
      filters: reportData.filters
    });

  } catch (error) {
    console.error("Error in getMetalStockLedgerReport:", error);

    // Handle specific error types
    if (error.message.includes("From date cannot be greater than to date")) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range: From date cannot be greater than to date",
        error: "INVALID_DATE_RANGE"
      });
    }

    if (error.message.includes("From date and to date are required")) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Internal server error while generating report",
      error: error.message
    });
  }
};

export const getStockBalance = async (req, res) => {
  try {
    const filters = req.body;
    // Call service to get report data
    
    const reportData = await reportService.getStockBalanceReport(filters);
    // Return success response (even if no data found)
    res.status(200).json({
      success: true,
      message: reportData.totalRecords > 0
        ? `Metal stock ledger report generated successfully with ${reportData.totalRecords} records`
        : "No transactions found for the specified criteria",
      data: reportData.data,
      totalRecords: reportData.totalRecords,
      filters: reportData.filters
    });

  } catch (error) {
    console.error("Error in getMetalStockLedgerReport:", error);

    // Handle specific error types
    if (error.message.includes("From date cannot be greater than to date")) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range: From date cannot be greater than to date",
        error: "INVALID_DATE_RANGE"
      });
    }

    if (error.message.includes("From date and to date are required")) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Internal server error while generating report",
      error: error.message
    });
  }
};

