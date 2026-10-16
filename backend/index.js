import db from "./db.js";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { listInvoices, getInvoiceByNumber } from "./services/invoiceService.js";
import { getInvoiceSummary } from "./services/summaryService.js";
import { getAgingSummary } from "./services/agingService.js";
import { getSettlementTrend } from "./services/settlementService.js";
import { getCustomerExposure } from "./services/customerExposureService.js";
import { getBillingInsights } from "./services/billingInsightsService.js";
import authRoutes from "./routes/authRoutes.js";
import { updateInvoice } from "./services/invoiceUpdateService.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { requirePermission } from "./middleware/permissionMiddleware.js";
import { PERMISSIONS } from "./permissions.js";
import { getInvoiceAuditHistory } from "./services/auditService.js";
import multer from "multer";
import { parse } from "csv-parse/sync";
import {
  previewInvoiceImport,
  commitInvoiceImport,
} from "./services/invoiceImportService.js";
import { voidInvoice } from "./services/invoiceVoidService.js";
import {
  listUsers,
  createUser,
  updateUser,
  replaceUserCustomerScope,
} from "./services/userManagementService.js";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Accounts Receivable API is running",
  });
});

app.get(
  "/api/summary",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  (req, res) => {
    try {
      const summary = getInvoiceSummary(req.query, req.user);

      res.json({
        data: summary,
      });
    } catch (error) {
      console.error("Summary API error:", error);

      res.status(500).json({
        error: "SUMMARY_ERROR",
        message: "Failed to calculate invoice summary.",
      });
    }
  },
);

app.get(
  "/api/aging",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  (req, res) => {
    try {
      const aging = getAgingSummary(req.query, req.user);

      res.json({
        data: aging,
      });
    } catch (error) {
      console.error("Aging API error:", error);

      res.status(500).json({
        error: "AGING_SUMMARY_ERROR",
        message: "Failed to calculate aging summary.",
      });
    }
  },
);

app.get(
  "/api/settlement-trend",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  (req, res) => {
    try {
      const trend = getSettlementTrend(req.query, req.user);

      res.json({ data: trend });
    } catch (error) {
      console.error("Settlement trend API error:", error);

      res.status(500).json({
        error: "SETTLEMENT_TREND_ERROR",
        message: "Failed to calculate settlement trend.",
      });
    }
  },
);

app.get(
  "/api/customer-exposure",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  (req, res) => {
    try {
      const customers = getCustomerExposure(req.query, req.user);

      res.json({ data: customers });
    } catch (error) {
      console.error("Customer exposure API error:", error);

      res.status(500).json({
        error: "CUSTOMER_EXPOSURE_ERROR",
        message: "Failed to calculate customer exposure.",
      });
    }
  },
);

app.get(
  "/api/billing-insights",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  (req, res) => {
    try {
      const insights = getBillingInsights(req.query, req.user);

      res.json({ data: insights });
    } catch (error) {
      console.error("Billing insights API error:", error);

      res.status(500).json({
        error: "BILLING_INSIGHTS_ERROR",
        message: "Failed to calculate billing insights.",
      });
    }
  },
);

app.get(
  "/api/invoices",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_INVOICES),
  (req, res) => {
    console.log("Invoice list route was called");

    try {
      const result = listInvoices(req.query, req.user);
      res.json(result);
    } catch (error) {
      console.error("Invoice API error:", error);

      res.status(400).json({
        error: "INVALID_QUERY",
        message: error.message,
      });
    }
  },
);

app.get(
  "/api/invoices/:invoiceNumber",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_INVOICES),
  (req, res) => {
    const invoice = getInvoiceByNumber(req.params.invoiceNumber, req.user);

    if (!invoice) {
      return res.status(404).json({
        error: "INVOICE_NOT_FOUND",
        message: "The requested invoice was not found.",
      });
    }

    res.json({ data: invoice });
  },
);

app.post(
  "/api/invoices/:invoiceNumber/void",
  authenticateToken,
  requirePermission(PERMISSIONS.VOID_INVOICE),
  (req, res) => {
    try {
      const result = voidInvoice(
        req.params.invoiceNumber,
        req.body?.reason,
        req.user,
      );

      return res.json({ data: result });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: "INVOICE_VOID_FAILED",
        message: error.status ? error.message : "Unable to void the invoice.",
      });
    }
  },
);

app.patch(
  "/api/invoices/bulk",
  authenticateToken,
  requirePermission(PERMISSIONS.BULK_ACTIONS),
  (req, res) => {
    try {
      const { invoiceNumbers, changes } = req.body;

      if (
        !Array.isArray(invoiceNumbers) ||
        invoiceNumbers.length === 0 ||
        invoiceNumbers.length > 500 ||
        !changes ||
        typeof changes !== "object" ||
        Array.isArray(changes) ||
        Object.keys(changes).length === 0
      ) {
        return res.status(400).json({
          error: "INVALID_BULK_REQUEST",
          message:
            "Provide 1–500 invoice numbers and a non-empty changes object.",
        });
      }

      if (
        invoiceNumbers.some(
          (number) => typeof number !== "string" || !number.trim(),
        ) ||
        new Set(invoiceNumbers).size !== invoiceNumbers.length
      ) {
        return res.status(400).json({
          error: "INVALID_INVOICE_NUMBERS",
          message:
            "Invoice numbers must be non-empty strings without duplicates.",
        });
      }

      const results = [];

      for (const invoiceNumber of invoiceNumbers) {
        try {
          const invoice = updateInvoice(invoiceNumber, changes, req.user);

          results.push({
            invoiceNumber,
            success: true,
            data: invoice,
          });
        } catch (error) {
          results.push({
            invoiceNumber,
            success: false,
            error: error.message,
            status: error.status || 400,
          });
        }
      }

      const failed = results.filter((item) => !item.success).length;

      return res.status(failed === results.length ? 400 : 200).json({
        data: {
          total: results.length,
          succeeded: results.length - failed,
          failed,
          results,
        },
      });
    } catch (error) {
      console.error("Bulk invoice update error:", error);

      return res.status(500).json({
        error: "BULK_UPDATE_FAILED",
        message: "Unable to process the bulk update.",
      });
    }
  },
);

app.patch(
  "/api/invoices/:invoiceNumber",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_INVOICES),
  (req, res) => {
    try {
      const invoice = updateInvoice(
        req.params.invoiceNumber,
        req.body,
        req.user,
      );

      res.json({ data: invoice });
    } catch (error) {
      console.error("Invoice update error:", error);

      res.status(error.status || 400).json({
        error:
          error.status === 404 ? "INVOICE_NOT_FOUND" : "INVOICE_UPDATE_FAILED",
        message: error.message,
      });
    }
  },
);

app.get(
  "/api/invoices/:invoiceNumber/audit",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_INVOICES),
  (req, res) => {
    try {
      const data = getInvoiceAuditHistory(req.params.invoiceNumber, req.user);

      res.json({ data });
    } catch (error) {
      res.status(error.status || 500).json({
        error:
          error.status === 404 ? "INVOICE_NOT_FOUND" : "AUDIT_HISTORY_FAILED",
        message: error.message,
      });
    }
  },
);

app.post(
  "/api/invoices/import/preview",
  authenticateToken,
  requirePermission(PERMISSIONS.UPLOAD_DATA),
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "FILE_REQUIRED",
          message: "Please upload a CSV file.",
        });
      }

      if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: "Only CSV files are supported by this endpoint.",
        });
      }

      const rows = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });

      if (rows.length === 0) {
        return res.status(400).json({
          error: "EMPTY_FILE",
          message: "The CSV file contains no data rows.",
        });
      }

      const preview = previewInvoiceImport(rows);

      return res.json({ data: preview });
    } catch (error) {
      console.error("Invoice import preview error:", error);

      return res.status(400).json({
        error: "IMPORT_PREVIEW_FAILED",
        message: "Unable to parse or validate the CSV file.",
      });
    }
  },
);

app.post(
  "/api/invoices/import/commit",
  authenticateToken,
  requirePermission(PERMISSIONS.UPLOAD_DATA),
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "FILE_REQUIRED",
          message: "Please upload the CSV file to commit.",
        });
      }

      if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: "Only CSV files are supported by this endpoint.",
        });
      }

      const rows = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });

      if (rows.length === 0) {
        return res.status(400).json({
          error: "EMPTY_FILE",
          message: "The CSV file contains no data rows.",
        });
      }

      const result = commitInvoiceImport(rows);

      return res.json({ data: result });
    } catch (error) {
      console.error("Invoice import commit error:", error);

      return res.status(error.status || 500).json({
        error: "IMPORT_COMMIT_FAILED",
        message: error.status
          ? error.message
          : "The import could not be completed.",
      });
    }
  },
);

app.get(
  "/api/users",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  (req, res) => {
    try {
      return res.json({ data: listUsers() });
    } catch (error) {
      return res.status(500).json({
        error: "USER_LIST_FAILED",
        message: "Unable to list users.",
      });
    }
  },
);

app.post(
  "/api/users",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  (req, res) => {
    try {
      return res.status(201).json({ data: createUser(req.body) });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: "USER_CREATE_FAILED",
        message: error.status ? error.message : "Unable to create user.",
      });
    }
  },
);

app.patch(
  "/api/users/:userId",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  (req, res) => {
    try {
      return res.json({
        data: updateUser(req.params.userId, req.body),
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: "USER_UPDATE_FAILED",
        message: error.status ? error.message : "Unable to update user.",
      });
    }
  },
);

app.put(
  "/api/users/:userId/customer-scope",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  (req, res) => {
    try {
      return res.json({
        data: replaceUserCustomerScope(
          req.params.userId,
          req.body?.customerIDs,
        ),
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: "CUSTOMER_SCOPE_UPDATE_FAILED",
        message: error.status
          ? error.message
          : "Unable to update customer scope.",
      });
    }
  },
);

// Log unmatched API routes to help diagnose routing problems.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API_ROUTE_NOT_FOUND",
    message: `No API route found for ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
