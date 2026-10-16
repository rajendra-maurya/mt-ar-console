import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

export function getBillingInsights(query = {}, access = {}) {
  const { parameters, whereClause, daysLateSql } = buildInvoiceFilters(query, access);

  return db
    .prepare(
      `
    SELECT
      paperless_bill AS billingType,
      COUNT(*) AS totalInvoices,

      ROUND(
        AVG(${daysLateSql}),
        2
      ) AS averageDaysLate,

      ROUND(
        100.0 * SUM(
          CASE WHEN disputed = 1 THEN 1 ELSE 0 END
        ) / NULLIF(COUNT(*), 0),
        2
      ) AS disputeRate

    FROM invoices
    ${whereClause}
    GROUP BY paperless_bill
    ORDER BY paperless_bill ASC
  `,
    )
    .all(parameters);
}
