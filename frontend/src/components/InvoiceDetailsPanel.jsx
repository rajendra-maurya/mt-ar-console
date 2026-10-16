import { getCurrentUser } from "../api/authApi.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, History, FileText } from "lucide-react";
import {
  fetchInvoiceDetails,
  fetchInvoiceAuditHistory,
  updateInvoiceDetails,
} from "../api/invoiceDetailsApi.js";
import * as XLSX from "xlsx";
import { hasPermission, PERMISSIONS } from "../permissions.js";

function formatDate(value) {
  if (!value) return "—";
  return value;
}

function formatAmount(value) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function InvoiceDetailsPanel({ invoiceNumber, onClose }) {
  const {
    data: invoice,
    isPending: invoiceLoading,
    isError: invoiceError,
    error: invoiceErrorDetails,
  } = useQuery({
    queryKey: ["invoice-details", invoiceNumber],
    queryFn: () => fetchInvoiceDetails(invoiceNumber),
    enabled: Boolean(invoiceNumber),
  });

  const {
    data: auditHistory = [],
    isPending: auditLoading,
    isError: auditError,
    error: auditErrorDetails,
  } = useQuery({
    queryKey: ["invoice-audit", invoiceNumber],
    queryFn: () => fetchInvoiceAuditHistory(invoiceNumber),
    enabled: Boolean(invoiceNumber),
  });

  const queryClient = useQueryClient();

  const currentUser = getCurrentUser();

  const canExportAudit = hasPermission(
    currentUser?.role,
    PERMISSIONS.EXPORT_AUDIT,
  );

  const canEditWorkflow = ["analyst", "lead", "admin"].includes(
    currentUser?.role?.toLowerCase(),
  );

  const [workflowStatus, setWorkflowStatus] = useState("open");
  const [assignedOwner, setAssignedOwner] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [note, setNote] = useState("");
  const [disputed, setDisputed] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function handleSaveWorkflow(event) {
    event.preventDefault();
    setSaveMessage("");

    try {
      await updateInvoiceDetails(invoiceNumber, {
        workflowStatus,
        assignedOwner: assignedOwner || "Unassigned",
        nextFollowUpDate: nextFollowUpDate || null,
        note: note || null,
      });

      await queryClient.invalidateQueries({
        queryKey: ["invoice-details", invoiceNumber],
      });

      await queryClient.invalidateQueries({
        queryKey: ["invoice-audit", invoiceNumber],
      });

      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });

      setSaveMessage("Workflow changes saved successfully.");
    } catch (error) {
      setSaveMessage(error.message || "Unable to save changes.");
    }
  }

  function handleExportAudit() {
    if (!canExportAudit || auditHistory.length === 0) return;

    const rows = auditHistory.map((entry) => ({
      Invoice: invoiceNumber,
      Field: entry.field,
      "Old value": entry.oldValue ?? "",
      "New value": entry.newValue ?? "",
      "Changed by": entry.changedBy ?? "Unknown user",
      "Changed at": entry.changedAt ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit History");

    XLSX.writeFile(
      workbook,
      `invoice-${invoiceNumber}-audit-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-[#C9D2E4] bg-white p-5">
          <div>
            <h2 id="invoice-details-title" className="text-lg font-bold">
              Invoice details
            </h2>
            <p className="mt-1 text-sm text-[#595959]">
              Invoice {invoiceNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice details"
            className="rounded-lg p-2 hover:bg-[#F1F4FA] focus-visible:outline-2 focus-visible:outline-[#244BA6]"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-5">
          {invoiceLoading && (
            <p role="status" className="text-sm text-[#595959]">
              Loading invoice details…
            </p>
          )}

          {invoiceError && (
            <p role="alert" className="text-sm text-red-700">
              {invoiceErrorDetails.message}
            </p>
          )}

          {invoice && (
            <section aria-label="Invoice information">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText size={18} />
                Invoice information
              </h3>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Invoice number", invoice.invoice_number],
                  ["Customer ID", invoice.customer_id],
                  ["Country code", invoice.country_code],
                  ["Invoice date", formatDate(invoice.invoice_date)],
                  ["Due date", formatDate(invoice.due_date)],
                  ["Settled date", formatDate(invoice.settled_date)],
                  ["Amount", formatAmount(invoice.invoice_amount)],
                  [
                    "Settlement",
                    invoice.settlement_status ??
                      (invoice.settled_date ? "Settled" : "Outstanding"),
                  ],
                  ["Workflow status", invoice.workflow_status ?? "—"],
                  ["Disputed", Number(invoice.disputed) ? "Yes" : "No"],
                  ["Billing type", invoice.paperless_bill ?? "—"],
                  ["Assigned owner", invoice.assigned_owner || "Unassigned"],
                  ["Next follow-up", formatDate(invoice.next_follow_up_date)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#C9D2E4] p-3"
                  >
                    <dt className="text-xs font-medium text-[#595959]">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-semibold">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 rounded-lg border border-[#C9D2E4] p-3">
                <p className="text-xs font-medium text-[#595959]">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {invoice.note || "No note"}
                </p>
              </div>
            </section>
          )}

          <section aria-label="Workflow editor">
            <h3 className="mb-3 font-semibold">Workflow management</h3>

            {["analyst", "lead", "admin"].includes(
              currentUser?.role?.toLowerCase(),
            ) && (
              <div className="mb-4 rounded-lg border border-[#C9D2E4] p-4">
                <h4 className="font-medium">Dispute status</h4>

                <p className="mt-1 text-sm text-[#595959]">
                  Current status: {disputed ? "Disputed" : "Not disputed"}
                </p>

                {!disputed &&
                  currentUser?.role?.toLowerCase() === "analyst" && (
                    <button
                      type="button"
                      onClick={async () => {
                        setDisputeMessage("");
                        try {
                          await updateInvoiceDetails(invoiceNumber, {
                            disputed: true,
                          });

                          await queryClient.invalidateQueries({
                            queryKey: ["invoice-details", invoiceNumber],
                          });

                          await queryClient.invalidateQueries({
                            queryKey: ["invoice-audit", invoiceNumber],
                          });

                          await queryClient.invalidateQueries({
                            queryKey: ["invoices"],
                          });

                          await queryClient.invalidateQueries({
                            queryKey: ["summary"],
                          });

                          setDisputed(true);
                          setDisputeMessage("Dispute raised successfully.");
                          await queryClient.invalidateQueries({
                            queryKey: ["invoice-details", invoiceNumber],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["invoice-audit", invoiceNumber],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["invoices"],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["summary"],
                          });
                          setDisputeMessage("Dispute raised successfully.");
                        } catch (error) {
                          setDisputeMessage(
                            error.message || "Unable to raise dispute.",
                          );
                        }
                      }}
                      className="mt-3 rounded-lg bg-[#244BA6] px-4 py-2 text-white"
                    >
                      Raise dispute
                    </button>
                  )}

                {disputeMessage && (
                  <p role="status" className="mt-2 text-sm">
                    {disputeMessage}
                  </p>
                )}
              </div>
            )}

            {canEditWorkflow ? (
              <form onSubmit={handleSaveWorkflow} className="space-y-4">
                <div>
                  <label
                    htmlFor="workflow-status"
                    className="mb-1 block text-sm font-medium"
                  >
                    Workflow status
                  </label>
                  <select
                    id="workflow-status"
                    value={workflowStatus}
                    onChange={(event) => setWorkflowStatus(event.target.value)}
                    className="w-full rounded-lg border border-[#C9D2E4] p-2"
                  >
                    <option value="open">Open</option>
                    <option value="in_dispute">In dispute</option>
                    <option value="escalated">Escalated</option>
                    <option value="promised">Promised</option>
                    <option value="settled">Settled</option>
                    <option value="written_off">Written off</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="assigned-owner"
                    className="mb-1 block text-sm font-medium"
                  >
                    Assigned owner
                  </label>
                  <input
                    id="assigned-owner"
                    value={assignedOwner}
                    onChange={(event) => setAssignedOwner(event.target.value)}
                    maxLength={2000}
                    className="w-full rounded-lg border border-[#C9D2E4] p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="follow-up-date"
                    className="mb-1 block text-sm font-medium"
                  >
                    Next follow-up date
                  </label>
                  <input
                    id="follow-up-date"
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(event) =>
                      setNextFollowUpDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-[#C9D2E4] p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="workflow-note"
                    className="mb-1 block text-sm font-medium"
                  >
                    Note
                  </label>
                  <textarea
                    id="workflow-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="w-full rounded-lg border border-[#C9D2E4] p-2"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-[#244BA6] px-4 py-2 text-white hover:bg-[#0E427E]"
                >
                  Save workflow
                </button>

                {saveMessage && (
                  <p role="status" className="text-sm">
                    {saveMessage}
                  </p>
                )}
              </form>
            ) : (
              <p className="text-sm text-[#595959]">
                You have read-only access to workflow fields.
              </p>
            )}
          </section>

          <section aria-label="Invoice audit history">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <History size={18} />
              Change history
            </h3>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <History size={18} />
                Change history
              </h3>

              {canExportAudit && (
                <button
                  type="button"
                  onClick={handleExportAudit}
                  disabled={
                    auditLoading || auditError || auditHistory.length === 0
                  }
                  className="rounded-lg border border-[#244BA6] px-3 py-2 text-sm font-medium text-[#244BA6] hover:bg-[#F1F4FA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export audit history
                </button>
              )}
            </div>

            {auditLoading && (
              <p role="status" className="text-sm text-[#595959]">
                Loading change history…
              </p>
            )}

            {auditError && (
              <p role="alert" className="text-sm text-red-700">
                {auditErrorDetails.message}
              </p>
            )}

            {!auditLoading && !auditError && auditHistory.length === 0 && (
              <p className="rounded-lg border border-[#C9D2E4] p-4 text-sm text-[#595959]">
                No changes have been recorded for this invoice.
              </p>
            )}

            <ol className="space-y-3">
              {auditHistory.map((entry, index) => (
                <li
                  key={`${entry.field}-${entry.changedAt}-${index}`}
                  className="rounded-lg border border-[#C9D2E4] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{entry.field}</span>
                    <time className="text-xs text-[#595959]">
                      {entry.changedAt}
                    </time>
                  </div>

                  <p className="mt-2 text-sm">
                    <span className="text-[#595959]">From: </span>
                    {entry.oldValue ?? "—"}
                  </p>

                  <p className="mt-1 text-sm">
                    <span className="text-[#595959]">To: </span>
                    {entry.newValue ?? "—"}
                  </p>

                  <p className="mt-2 text-xs text-[#595959]">
                    Changed by {entry.changedBy || "Unknown user"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}
