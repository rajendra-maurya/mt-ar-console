import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

export function getCustomerExposure(query = {}, access = {}) {
  const { parameters, whereClause, daysLateSql } = buildInvoiceFilters(query, access);

  const rows = db
    .prepare(
      `
    SELECT
      customer_id AS customerID,
      COUNT(*) AS outstandingInvoices,
      ROUND(SUM(invoice_amount), 2) AS outstandingAmount,
      ROUND(
        AVG(${daysLateSql}),
        2
      ) AS averageDaysLate
    FROM invoices
    ${
      whereClause
        ? `${whereClause} AND settled_date IS NULL`
        : "WHERE settled_date IS NULL"
    }
    GROUP BY customer_id
    ORDER BY outstandingAmount DESC, customer_id ASC
  `,
    )
    .all(parameters);

  return rows;
}
