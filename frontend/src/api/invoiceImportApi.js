import * as XLSX from "xlsx";

const API_BASE_URL = "http://localhost:5000/api";

async function normalizeImportFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (extension === "csv") {
    return file;
  }

  if (!["xlsx", "xls"].includes(extension)) {
    throw new Error("Choose a CSV, XLSX, or XLS file.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellText: true,
    cellDates: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The Excel workbook contains no worksheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const csvContent = XLSX.utils.sheet_to_csv(worksheet, {
    blankrows: false,
  });

  if (!csvContent.trim()) {
    throw new Error("The selected worksheet contains no data.");
  }

  const csvName = file.name.replace(/\.(xlsx|xls)$/i, ".csv");

  return new File([csvContent], csvName, {
    type: "text/csv",
  });
}

async function uploadImportFile(endpoint, file) {
  const token = localStorage.getItem("authToken");

  if (!token) {
    throw new Error("Please sign in before importing invoices.");
  }

  const normalizedFile = await normalizeImportFile(file);
  const formData = new FormData();

  formData.append("file", normalizedFile);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Invoice import request failed.");
  }

  return result.data;
}

export function previewInvoiceFile(file) {
  return uploadImportFile("/invoices/import/preview", file);
}

export function commitInvoiceFile(file) {
  return uploadImportFile("/invoices/import/commit", file);
}
