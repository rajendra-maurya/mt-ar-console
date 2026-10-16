import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

export function getSettlementTrend(query = {}, access = {}) {
  const { parameters, whereClause } = buildInvoiceFilters(query, access);

  const conditions = ["settled_date IS NOT NULL"];

  if (whereClause) {
    conditions.push(whereClause.replace(/^WHERE\s+/i, ""));
  }

  return db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', settled_date) AS month,
      COUNT(*) AS settledInvoices,
      ROUND(SUM(invoice_amount), 2) AS settledAmount,
      ROUND(AVG(days_to_settle), 2) AS averageDaysToSettle
    FROM invoices
    WHERE ${conditions.join(" AND ")}
    GROUP BY strftime('%Y-%m', settled_date)
    ORDER BY month ASC
  `,
    )
    .all(parameters);
}
