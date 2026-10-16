const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseISODate(value) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function calculateDaysLate(invoice, today = new Date()) {
  if (invoice.settled_date) {
    return Math.max(0, Number(invoice.days_late) || 0);
  }

  const dueDate = parseISODate(invoice.due_date);

  if (!dueDate) {
    return null;
  }

  const currentDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  return Math.max(0, Math.floor((currentDate - dueDate) / DAY_IN_MS));
}

export function getAgingBucket(daysLate, settledDate) {
  if (settledDate || daysLate === null || daysLate <= 0) {
    return "Not overdue";
  }

  if (daysLate <= 30) {
    return "1–30 days";
  }

  if (daysLate <= 60) {
    return "31–60 days";
  }

  if (daysLate <= 90) {
    return "61–90 days";
  }

  return "Over 90 days";
}

export function getSettlementStatus(invoice) {
  return invoice.settled_date ? "Settled" : "Outstanding";
}
