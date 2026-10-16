import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

export function getInvoiceSummary(query = {}, access = {}) {
  const { parameters, whereClause, daysLateSql } = buildInvoiceFilters(query, access);

  const summary = db
    .prepare(
      `
    SELECT
      COUNT(*) AS totalInvoices,

      COALESCE(SUM(invoice_amount), 0) AS totalInvoiced,

      SUM(
        CASE WHEN settled_date IS NULL
        THEN 1 ELSE 0 END
      ) AS outstandingInvoices,

      COALESCE(SUM(
        CASE WHEN settled_date IS NULL
        THEN invoice_amount ELSE 0 END
      ), 0) AS outstandingAmount,

      SUM(
        CASE
          WHEN settled_date IS NULL
            AND (${daysLateSql}) > 0
          THEN 1 ELSE 0
        END
      ) AS overdueInvoices,

      COALESCE(SUM(
        CASE
          WHEN settled_date IS NULL
            AND (${daysLateSql}) > 0
          THEN invoice_amount ELSE 0
        END
      ), 0) AS overdueAmount,

      SUM(
        CASE WHEN disputed = 1
        THEN 1 ELSE 0 END
      ) AS disputedInvoices,

      ROUND(AVG(
        CASE
          WHEN settled_date IS NOT NULL
          THEN days_to_settle
          ELSE NULL
        END
      ), 2) AS averageDaysToSettle,

      ROUND(AVG(
        CASE
          WHEN settled_date IS NULL
            AND (${daysLateSql}) > 0
          THEN (${daysLateSql})
          ELSE NULL
        END
      ), 2) AS averageDaysLate,

      ROUND(
        100.0 * SUM(
          CASE
            WHEN settled_date IS NULL
              AND (${daysLateSql}) > 0
            THEN 1 ELSE 0
          END
        ) / NULLIF(COUNT(*), 0),
        2
      ) AS overdueShare,

      ROUND(
        100.0 * SUM(
          CASE WHEN disputed = 1
          THEN 1 ELSE 0 END
        ) / NULLIF(COUNT(*), 0),
        2
      ) AS disputeRate

    FROM invoices
    ${whereClause}
  `,
    )
    .get(parameters);

  return {
    ...summary,
    totalInvoiced: Number(summary.totalInvoiced.toFixed(2)),
    outstandingAmount: Number(summary.outstandingAmount.toFixed(2)),
    overdueAmount: Number(summary.overdueAmount.toFixed(2)),
  };
}
