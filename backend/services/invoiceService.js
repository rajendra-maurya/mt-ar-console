import db from "../db.js";
import { buildInvoiceFilters } from "./invoiceFilterService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 1000;

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function listInvoices(query = {}, access = {}) {
  const page = parseInteger(query.page, DEFAULT_PAGE);
  const requestedPageSize = parseInteger(query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  const { parameters, whereClause, daysLateSql, agingBucketSql } =
    buildInvoiceFilters(query, access);

  const { total } = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM invoices
    ${whereClause}
  `,
    )
    .get(parameters);

  const sortFields = {
    invoiceNumber: "invoice_number",
    customerID: "customer_id",
    invoiceDate: "invoice_date",
    dueDate: "due_date",
    invoiceAmount: "invoice_amount",
    daysLate: `(${daysLateSql})`,
    settledDate: "settled_date",
  };

  let orderBy;

  if (!query.sortBy) {
    orderBy = `
      CASE
        WHEN settled_date IS NULL THEN (${daysLateSql})
        ELSE -1
      END DESC,
      due_date ASC,
      id ASC
    `;
  } else {
    const sortField = sortFields[query.sortBy];

    if (!sortField) {
      throw new Error("Invalid sortBy field.");
    }

    const direction = query.sortOrder === "asc" ? "ASC" : "DESC";

    orderBy = `${sortField} ${direction}, id ASC`;
  }

  const offset = (page - 1) * pageSize;

  const data = db
    .prepare(
      `
    SELECT
      *,
      (${daysLateSql}) AS days_late_calculated,
      (${agingBucketSql}) AS aging_bucket,
      CASE
        WHEN settled_date IS NOT NULL THEN 'Settled'
        ELSE 'Outstanding'
      END AS settlement_status
    FROM invoices
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT @pageSize OFFSET @offset
  `,
    )
    .all({
      ...parameters,
      pageSize,
      offset,
    });

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function getInvoiceByNumber(invoiceNumber, access = {}) {
  if (access.role === "analyst") {
    return db
      .prepare(
        `
      SELECT *
      FROM invoices
      WHERE invoice_number = ?
        AND customer_id IN (
          SELECT customer_id
          FROM user_customer_scope
          WHERE user_id = ?
        )
    `,
      )
      .get(invoiceNumber, access.id);
  }

  return db
    .prepare(
      `
    SELECT *
    FROM invoices
    WHERE invoice_number = ?
  `,
    )
    .get(invoiceNumber);
}
