const daysLateSql = `
  CASE
    WHEN settled_date IS NOT NULL
      THEN MAX(0, COALESCE(days_late, 0))
    ELSE MAX(
      0,
      CAST(
        julianday(date('now')) - julianday(due_date)
        AS INTEGER
      )
    )
  END
`;

const agingBucketSql = `
  CASE
    WHEN settled_date IS NOT NULL
      THEN 'Not overdue'
    WHEN julianday(date('now')) <= julianday(due_date)
      THEN 'Not overdue'
    WHEN julianday(date('now')) - julianday(due_date) <= 30
      THEN '1–30 days'
    WHEN julianday(date('now')) - julianday(due_date) <= 60
      THEN '31–60 days'
    WHEN julianday(date('now')) - julianday(due_date) <= 90
      THEN '61–90 days'
    ELSE 'Over 90 days'
  END
`;

export function buildInvoiceFilters(query = {}, access = {}) {
  const conditions = [];
  const parameters = {};

  if (access.role === "analyst") {
    const customerIDs = access.customerIDs ?? [];

    if (customerIDs.length === 0) {
      conditions.push("1 = 0");
    } else {
      const placeholders = customerIDs.map((_, index) => {
        const key = `scopeCustomer${index}`;
        parameters[key] = customerIDs[index];
        return `@${key}`;
      });

      conditions.push(`customer_id IN (${placeholders.join(", ")})`);
    }
  }

  if (query.search?.trim()) {
    conditions.push(`
      (
        customer_id LIKE @search
        OR invoice_number LIKE @search
      )
    `);
    parameters.search = `%${query.search.trim()}%`;
  }

  if (query.customerID) {
    conditions.push("customer_id = @customerID");
    parameters.customerID = query.customerID;
  }

  if (query.countryCode !== undefined && query.countryCode !== "") {
    const countryCode = Number(query.countryCode);

    if (!Number.isInteger(countryCode)) {
      throw new Error("countryCode must be an integer.");
    }

    conditions.push("country_code = @countryCode");
    parameters.countryCode = countryCode;
  }

  if (query.disputed !== undefined && query.disputed !== "") {
    if (!["true", "false"].includes(query.disputed)) {
      throw new Error("disputed must be true or false.");
    }

    conditions.push("disputed = @disputed");
    parameters.disputed = query.disputed === "true" ? 1 : 0;
  }

  if (query.settlementStatus === "settled") {
    conditions.push("settled_date IS NOT NULL");
  } else if (query.settlementStatus === "outstanding") {
    conditions.push("settled_date IS NULL");
  } else if (query.settlementStatus) {
    throw new Error("Invalid settlementStatus.");
  }

  if (query.billingType) {
    if (!["Paper", "Electronic"].includes(query.billingType)) {
      throw new Error("Invalid billingType.");
    }

    conditions.push("paperless_bill = @billingType");
    parameters.billingType = query.billingType;
  }

  if (query.invoiceDateFrom) {
    conditions.push("invoice_date >= @invoiceDateFrom");
    parameters.invoiceDateFrom = query.invoiceDateFrom;
  }

  if (query.invoiceDateTo) {
    conditions.push("invoice_date <= @invoiceDateTo");
    parameters.invoiceDateTo = query.invoiceDateTo;
  }

  if (query.dueDateFrom) {
    conditions.push("due_date >= @dueDateFrom");
    parameters.dueDateFrom = query.dueDateFrom;
  }

  if (query.dueDateTo) {
    conditions.push("due_date <= @dueDateTo");
    parameters.dueDateTo = query.dueDateTo;
  }

  if (query.amountMin !== undefined && query.amountMin !== "") {
    const amountMin = Number(query.amountMin);

    if (!Number.isFinite(amountMin) || amountMin < 0) {
      throw new Error("amountMin must be a nonnegative number.");
    }

    conditions.push("invoice_amount >= @amountMin");
    parameters.amountMin = amountMin;
  }

  if (query.amountMax !== undefined && query.amountMax !== "") {
    const amountMax = Number(query.amountMax);

    if (!Number.isFinite(amountMax) || amountMax < 0) {
      throw new Error("amountMax must be a nonnegative number.");
    }

    conditions.push("invoice_amount <= @amountMax");
    parameters.amountMax = amountMax;
  }

  if (
    query.amountMin !== undefined &&
    query.amountMin !== "" &&
    query.amountMax !== undefined &&
    query.amountMax !== "" &&
    Number(query.amountMin) > Number(query.amountMax)
  ) {
    throw new Error("amountMin cannot exceed amountMax.");
  }

  if (query.workflowStatus) {
    const allowedStatuses = [
      "open",
      "in_dispute",
      "escalated",
      "promised",
      "settled",
      "written_off",
    ];

    if (!allowedStatuses.includes(query.workflowStatus)) {
      throw new Error("Invalid workflowStatus.");
    }

    conditions.push("workflow_status = @workflowStatus");
    parameters.workflowStatus = query.workflowStatus;
  }

  if (query.daysLateMin !== undefined && query.daysLateMin !== "") {
    const min = Number(query.daysLateMin);

    if (!Number.isFinite(min) || min < 0) {
      throw new Error("daysLateMin must be a nonnegative number.");
    }

    parameters.daysLateMin = min;
    conditions.push(`(${daysLateSql}) >= @daysLateMin`);
  }

  if (query.daysLateMax !== undefined && query.daysLateMax !== "") {
    const max = Number(query.daysLateMax);

    if (!Number.isFinite(max) || max < 0) {
      throw new Error("daysLateMax must be a nonnegative number.");
    }

    parameters.daysLateMax = max;
    conditions.push(`(${daysLateSql}) <= @daysLateMax`);
  }

  if (
    query.daysLateMin !== undefined &&
    query.daysLateMin !== "" &&
    query.daysLateMax !== undefined &&
    query.daysLateMax !== "" &&
    Number(query.daysLateMin) > Number(query.daysLateMax)
  ) {
    throw new Error("daysLateMin cannot exceed daysLateMax.");
  }

  if (query.agingBucket) {
    const allowedBuckets = [
      "Not overdue",
      "1–30 days",
      "31–60 days",
      "61–90 days",
      "Over 90 days",
    ];

    if (!allowedBuckets.includes(query.agingBucket)) {
      throw new Error("Invalid agingBucket.");
    }

    conditions.push(`(${agingBucketSql}) = @agingBucket`);
    parameters.agingBucket = query.agingBucket;
  }

  return {
    conditions,
    parameters,
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    daysLateSql,
    agingBucketSql,
  };
}
