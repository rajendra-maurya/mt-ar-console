import { useState } from "react";
import { Upload, FileCheck, AlertCircle } from "lucide-react";
import {
  previewInvoiceFile,
  commitInvoiceFile,
} from "../api/invoiceImportApi.js";
import * as XLSX from "xlsx";

export default function InvoiceImportPanel({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePreview() {
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setPreview(null);
    setProgressMessage("Reading file and validating invoices...");

    try {
      const data = await previewInvoiceFile(file);
      setPreview(data);
      setProgressMessage(`Preview complete: ${data.totalRows} row(s) checked.`);
    } catch (err) {
      setError(err.message || "Preview failed.");
      setProgressMessage("");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file || !preview?.validRows) return;

    const confirmed = window.confirm(
      `Import ${preview.validRows} valid invoice(s)? Existing duplicates will be skipped.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await commitInvoiceFile(file);
      setResult(data);
      setPreview(null);
      setFile(null);
      onImported?.();
    } catch (err) {
      setError(err.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadErrorReport() {
    if (!preview?.rows?.length) return;

    const issueRows = preview.rows
      .filter((row) => !row.valid)
      .map((row) => ({
        "CSV Row": row.rowNumber,
        "Invoice Number": row.invoiceNumber || "",
        "Issue Type": row.duplicate ? "Duplicate" : "Validation error",
        Errors: row.errors?.join("; ") || "",
      }));

    if (!issueRows.length) {
      setError("There are no invalid or duplicate rows to report.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(issueRows);
    worksheet["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 60 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Issues");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `invoice-import-issues-${date}.xlsx`);
  }

  return (
    <section className="mb-6 rounded-xl border border-[#C9D2E4] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Upload size={20} className="text-[#244BA6]" />
        <h2 className="text-lg font-semibold text-[#262626]">
          Import invoices
        </h2>
      </div>

      <p className="mb-4 text-sm text-[#595959]">
        Upload a CSV file to validate invoices before importing them. Maximum
        file size: 10 MB.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          aria-label="Choose invoice CSV file"
          disabled={loading}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
            setError("");
          }}
          className="block w-full text-sm text-[#262626] file:mr-3 file:rounded-md file:border-0 file:bg-[#F1F4FA] file:px-4 file:py-2"
        />

        <button
          type="button"
          onClick={handlePreview}
          disabled={!file || loading}
          className="rounded-md bg-[#244BA6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Processing..." : "Preview"}
        </button>
      </div>

      {progressMessage && (
        <p
          className="mt-3 text-sm text-[#595959]"
          role="status"
          aria-live="polite"
        >
          {progressMessage}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-5">
          <h3 className="mb-3 font-semibold text-[#262626]">Import preview</h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total rows", preview.totalRows],
              ["Valid rows", preview.validRows],
              ["Invalid rows", preview.invalidRows],
              ["Duplicates", preview.duplicateRows],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[#C9D2E4] bg-[#F1F4FA] p-3"
              >
                <p className="text-xs text-[#595959]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[#262626]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {preview.rows?.some((row) => !row.valid) && (
            <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-[#C9D2E4]">
              <button
                type="button"
                onClick={handleDownloadErrorReport}
                className="mb-3 rounded-md border border-[#244BA6] px-3 py-2 text-sm font-medium text-[#244BA6]"
              >
                Download error report
              </button>

              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#F1F4FA]">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Invoice number</th>
                    <th className="p-2">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows
                    .filter((row) => !row.valid)
                    .slice(0, 100)
                    .map((row) => (
                      <tr
                        key={row.rowNumber}
                        className="border-t border-[#C9D2E4]"
                      >
                        <td className="p-2">{row.rowNumber}</td>
                        <td className="p-2">{row.invoiceNumber || "—"}</td>
                        <td className="p-2">
                          {row.duplicate
                            ? "Duplicate invoice"
                            : row.errors.join(", ")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="p-2 text-xs text-[#595959]">
                Showing at most 100 rows with issues.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleCommit}
            disabled={loading || preview.validRows === 0}
            className="mt-4 rounded-md bg-[#4C9D2F] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm import ({preview.validRows} valid)
          </button>
        </div>
      )}

      {result && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-[#C9D2E4] p-4"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-[#262626]">
            <FileCheck size={18} />
            Import results
          </div>
          <p className="text-sm text-[#595959]">
            Imported: {result.imported} · Skipped duplicates:{" "}
            {result.skippedDuplicates} · Failed: {result.failed}
          </p>
        </div>
      )}
    </section>
  );
}
