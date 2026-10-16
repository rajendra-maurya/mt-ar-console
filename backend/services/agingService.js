import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

export function getAgingSummary(query = {}, access = {}) {
  const { parameters, whereClause } = buildInvoiceFilters(query, access);

  const outstandingCondition = whereClause
    ? `${whereClause} AND settled_date IS NULL`
    : "WHERE settled_date IS NULL";

  const rows = db
    .prepare(
      `
    SELECT
      CASE
        WHEN date('now') <= date(due_date)
          THEN 'Not overdue'
        WHEN julianday(date('now')) - julianday(due_date) <= 30
          THEN '1–30 days'
        WHEN julianday(date('now')) - julianday(due_date) <= 60
          THEN '31–60 days'
        WHEN julianday(date('now')) - julianday(due_date) <= 90
          THEN '61–90 days'
        ELSE 'Over 90 days'
      END AS agingBucket,
      COUNT(*) AS invoiceCount,
      ROUND(COALESCE(SUM(invoice_amount), 0), 2) AS outstandingAmount
    FROM invoices
    ${outstandingCondition}
    GROUP BY agingBucket
  `,
    )
    .all(parameters);

  const bucketOrder = [
    "Not overdue",
    "1–30 days",
    "31–60 days",
    "61–90 days",
    "Over 90 days",
  ];

  const resultsByBucket = new Map(rows.map((row) => [row.agingBucket, row]));

  return bucketOrder.map((agingBucket) => {
    const result = resultsByBucket.get(agingBucket);

    return {
      agingBucket,
      invoiceCount: result?.invoiceCount ?? 0,
      outstandingAmount: result?.outstandingAmount ?? 0,
    };
  });
}
