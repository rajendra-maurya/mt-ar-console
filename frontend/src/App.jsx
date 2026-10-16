import { useQueryClient } from "@tanstack/react-query";
import Login from "./components/Login.jsx";
import { getCurrentUser, logoutUser } from "./api/authApi.js";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSummary,
  fetchAging,
  fetchSettlementTrend,
  fetchCustomerExposure,
  fetchBillingInsights,
} from "./api/summaryApi.js";
import { fetchInvoices, bulkUpdateInvoices } from "./api/invoiceApi.js";
import { useSearchParams } from "react-router-dom";
import InvoiceDetailsPanel from "./components/InvoiceDetailsPanel.jsx";
import { hasPermission, PERMISSIONS } from "./permissions.js";
import * as XLSX from "xlsx";
import AgingChart from "./components/AgingChart.jsx";
import SettlementTrendChart from "./components/SettlementTrendChart.jsx";
import CustomerExposureChart from "./components/CustomerExposureChart.jsx";
import BillingInsightsChart from "./components/BillingInsightsChart.jsx";
import {
  Activity,
  BarChart3,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import InvoiceImportPanel from "./components/InvoiceImportPanel.jsx";
import UserManagement from "./components/UserManagement.jsx";

const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Invoices", icon: FileText },
  { label: "Insights", icon: BarChart3 },
];

function App() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState(null);

  const [selectedInvoiceNumbers, setSelectedInvoiceNumbers] = useState([]);
  const [bulkWorkflowStatus, setBulkWorkflowStatus] = useState("open");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const [activeSection, setActiveSection] = useState("Dashboard");

  const canUploadData = currentUser?.role?.toLowerCase() === "admin";

  const [searchParams, setSearchParams] = useSearchParams();

  const canBulkUpdate = ["lead", "admin"].includes(
    currentUser?.role?.toLowerCase(),
  );

  const canExportCurrentView = hasPermission(
    currentUser?.role,
    PERMISSIONS.EXPORT_CURRENT_VIEW,
  );

  const skipUrlUpdate = useRef(false);

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || "",
  );

  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  const [settlementStatus, setSettlementStatus] = useState(
    () => searchParams.get("settlementStatus") || "",
  );

  const [disputed, setDisputed] = useState(
    () => searchParams.get("disputed") || "",
  );

  const [countryCode, setCountryCode] = useState(
    () => searchParams.get("countryCode") || "",
  );

  const [billingType, setBillingType] = useState(
    () => searchParams.get("billingType") || "",
  );

  const [invoiceDateFrom, setInvoiceDateFrom] = useState(
    () => searchParams.get("invoiceDateFrom") || "",
  );

  const [invoiceDateTo, setInvoiceDateTo] = useState(
    () => searchParams.get("invoiceDateTo") || "",
  );

  const [dueDateFrom, setDueDateFrom] = useState(
    () => searchParams.get("dueDateFrom") || "",
  );

  const [dueDateTo, setDueDateTo] = useState(
    () => searchParams.get("dueDateTo") || "",
  );

  const [amountMin, setAmountMin] = useState(
    () => searchParams.get("amountMin") || "",
  );

  const [amountMax, setAmountMax] = useState(
    () => searchParams.get("amountMax") || "",
  );

  const [daysLateMin, setDaysLateMin] = useState(
    () => searchParams.get("daysLateMin") || "",
  );

  const [daysLateMax, setDaysLateMax] = useState(
    () => searchParams.get("daysLateMax") || "",
  );

  const {
    data: summary,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "summary",
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchSummary({
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
  });

  const {
    data: agingData = [],
    isLoading: agingLoading,
    error: agingError,
  } = useQuery({
    queryKey: [
      "aging",
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchAging({
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
  });

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("daysLate");
  const [sortOrder, setSortOrder] = useState("desc");

  const {
    data: invoiceResult,
    isPending: invoicesLoading,
    isError: invoicesError,
    error: invoicesErrorDetails,
  } = useQuery({
    queryKey: [
      "invoices",
      page,
      sortBy,
      sortOrder,
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchInvoices({
        page,
        pageSize: 20,
        sortBy,
        sortOrder,
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: settlementTrendData = [],
    isLoading: settlementTrendLoading,
    error: settlementTrendError,
  } = useQuery({
    queryKey: [
      "settlement-trend",
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchSettlementTrend({
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
  });

  const {
    data: customerExposureData = [],
    isLoading: customerExposureLoading,
    error: customerExposureError,
  } = useQuery({
    queryKey: [
      "customer-exposure",
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchCustomerExposure({
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
  });

  const {
    data: billingInsightsData = [],
    isLoading: billingInsightsLoading,
    error: billingInsightsError,
  } = useQuery({
    queryKey: [
      "billing-insights",
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: () =>
      fetchBillingInsights({
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      }),
    enabled: Boolean(currentUser),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const previousUserKey = useRef(
    currentUser ? `${currentUser.id}:${currentUser.role}` : null,
  );

  useEffect(() => {
    const nextUserKey = currentUser
      ? `${currentUser.id}:${currentUser.role}`
      : null;

    if (previousUserKey.current === nextUserKey) {
      return;
    }

    previousUserKey.current = nextUserKey;

    // Clear filters from the previous user or role.
    setSearchInput("");
    setSearch("");
    setSettlementStatus("");
    setDisputed("");
    setCountryCode("");
    setBillingType("");
    setInvoiceDateFrom("");
    setInvoiceDateTo("");
    setDueDateFrom("");
    setDueDateTo("");
    setAmountMin("");
    setAmountMax("");
    setDaysLateMin("");
    setDaysLateMax("");
    setPage(1);
    setSelectedInvoiceNumber(null);
    setSelectedInvoiceNumbers([]);

    // Remove old filter parameters from the URL.
    skipUrlUpdate.current = true;
    setSearchParams(new URLSearchParams());

    // Refresh cached data for the new session.
    queryClient.clear();
  }, [currentUser, queryClient, setSearchParams]);

  useEffect(() => {
    skipUrlUpdate.current = true;

    setSearchInput(searchParams.get("search") || "");
    setSearch(searchParams.get("search") || "");
    setSettlementStatus(searchParams.get("settlementStatus") || "");
    setDisputed(searchParams.get("disputed") || "");
    setCountryCode(searchParams.get("countryCode") || "");
    setBillingType(searchParams.get("billingType") || "");
    setInvoiceDateFrom(searchParams.get("invoiceDateFrom") || "");
    setInvoiceDateTo(searchParams.get("invoiceDateTo") || "");
    setDueDateFrom(searchParams.get("dueDateFrom") || "");
    setDueDateTo(searchParams.get("dueDateTo") || "");
    setAmountMin(searchParams.get("amountMin") || "");
    setAmountMax(searchParams.get("amountMax") || "");
    setDaysLateMin(searchParams.get("daysLateMin") || "");
    setDaysLateMax(searchParams.get("daysLateMax") || "");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    if (skipUrlUpdate.current) {
      skipUrlUpdate.current = false;
      return;
    }

    const nextParams = new URLSearchParams();

    const filters = {
      search,
      settlementStatus,
      disputed,
      countryCode,
      billingType,
      invoiceDateFrom,
      invoiceDateTo,
      dueDateFrom,
      dueDateTo,
      amountMin,
      amountMax,
      daysLateMin,
      daysLateMax,
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") {
        nextParams.set(key, value);
      }
    });

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams);
    }
  }, [
    search,
    settlementStatus,
    disputed,
    countryCode,
    billingType,
    invoiceDateFrom,
    invoiceDateTo,
    dueDateFrom,
    dueDateTo,
    amountMin,
    amountMax,
    daysLateMin,
    daysLateMax,
    searchParams,
    setSearchParams,
  ]);

  const invoices = invoiceResult?.data ?? [];
  const pagination = invoiceResult?.pagination;

  if (!currentUser) {
    return (
      <Login
        onLogin={async (user) => {
          setCurrentUser(user);
          await queryClient.invalidateQueries();
        }}
      />
    );
  }

  function toggleInvoiceSelection(invoiceNumber) {
    setSelectedInvoiceNumbers((current) =>
      current.includes(invoiceNumber)
        ? current.filter((number) => number !== invoiceNumber)
        : [...current, invoiceNumber],
    );
  }

  function toggleCurrentPageSelection() {
    const currentPageNumbers = invoices.map(
      (invoice) => invoice.invoice_number,
    );

    const allSelected =
      currentPageNumbers.length > 0 &&
      currentPageNumbers.every((number) =>
        selectedInvoiceNumbers.includes(number),
      );

    setSelectedInvoiceNumbers((current) =>
      allSelected
        ? current.filter((number) => !currentPageNumbers.includes(number))
        : [...new Set([...current, ...currentPageNumbers])],
    );
  }

  async function handleBulkUpdate() {
    if (!canBulkUpdate || selectedInvoiceNumbers.length === 0) {
      return;
    }

    setIsBulkSaving(true);
    setBulkMessage("");

    try {
      const result = await bulkUpdateInvoices(selectedInvoiceNumbers, {
        workflowStatus: bulkWorkflowStatus,
      });

      await queryClient.invalidateQueries();

      setBulkMessage(
        `Updated ${result.succeeded} invoice(s). Failed: ${result.failed}.`,
      );

      setSelectedInvoiceNumbers((current) =>
        current.filter(
          (number) =>
            !result.results.some(
              (item) => item.invoiceNumber === number && item.success,
            ),
        ),
      );
    } catch (error) {
      setBulkMessage(error.message || "Bulk update failed.");
    } finally {
      setIsBulkSaving(false);
    }
  }

  async function handleExportCSV() {
    if (!canExportCurrentView) return;

    setBulkMessage("");

    try {
      // Reuse the filters currently applied to the invoice table.

      const exportFilters = {
        page: 1,
        pageSize: 1000,
        sortBy,
        sortOrder,
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      };

      // Fetch the first batch to discover the total matching count.
      const firstResult = await fetchInvoices(exportFilters);
      const allInvoices = [...firstResult.data];
      const total = firstResult.pagination.total;
      const totalPages = firstResult.pagination.totalPages;

      // Fetch the remaining batches, if any.
      for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
        const result = await fetchInvoices({
          ...exportFilters,
          page: pageNumber,
        });

        allInvoices.push(...result.data);
      }

      const exportColumns = [
        ["Invoice number", "invoice_number"],
        ["Customer", "customer_id"],
        ["Invoice date", "invoice_date"],
        ["Due date", "due_date"],
        ["Amount", "invoice_amount"],
        ["Status", "settlement_status"],
        ["Days late", "days_late_calculated"],
        ["Workflow status", "workflow_status"],
      ];

      const escapeCSV = (value) => {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection for untrusted text.
        if (/^[\t\r ]*[=+\-@]/.test(text)) {
          text = `'${text}`;
        }

        return `"${text.replace(/"/g, '""')}"`;
      };

      const rows = [
        exportColumns.map(([label]) => escapeCSV(label)).join(","),
        ...allInvoices.map((invoice) =>
          exportColumns.map(([, key]) => escapeCSV(invoice[key])).join(","),
        ),
      ];

      const blob = new Blob(["\uFEFF", rows.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setBulkMessage(
        `Exported ${allInvoices.length} of ${total} matching invoices.`,
      );
    } catch (error) {
      console.error("CSV export failed:", error);
      setBulkMessage(error.message || "Unable to export invoices.");
    }
  }

  async function handleExportExcel() {
    if (!canExportCurrentView) return;

    setBulkMessage("");

    try {
      const exportFilters = {
        page: 1,
        pageSize: 1000,
        sortBy,
        sortOrder,
        search,
        settlementStatus,
        disputed,
        countryCode,
        billingType,
        invoiceDateFrom,
        invoiceDateTo,
        dueDateFrom,
        dueDateTo,
        amountMin,
        amountMax,
        daysLateMin,
        daysLateMax,
      };

      const firstResult = await fetchInvoices(exportFilters);
      const allInvoices = [...firstResult.data];

      for (
        let pageNumber = 2;
        pageNumber <= firstResult.pagination.totalPages;
        pageNumber++
      ) {
        const result = await fetchInvoices({
          ...exportFilters,
          page: pageNumber,
        });
        allInvoices.push(...result.data);
      }

      const rows = allInvoices.map((invoice) => ({
        "Invoice number": String(invoice.invoice_number ?? ""),
        Customer: invoice.customer_id ?? "",
        "Invoice date": invoice.invoice_date ?? "",
        "Due date": invoice.due_date ?? "",
        Amount: Number(invoice.invoice_amount ?? 0),
        Status: invoice.settlement_status ?? "",
        "Days late": invoice.days_late_calculated ?? "",
        "Workflow status": invoice.workflow_status ?? "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        cellDates: false,
      });

      worksheet["!cols"] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 18 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

      XLSX.writeFile(
        workbook,
        `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );

      setBulkMessage(
        `Excel export completed: ${allInvoices.length} invoice(s).`,
      );
    } catch (error) {
      console.error("Excel export failed:", error);
      setBulkMessage(error.message || "Unable to export Excel file.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F4FA] text-[#262626]">
      {/* Top header */}
      <header className="flex min-h-16 items-center justify-between gap-4 bg-[#0E427E] px-4 text-white shadow-sm sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-2 text-[#0E427E]">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-wide sm:text-base">
              METTLER TOLEDO
            </h1>
            <p className="text-xs text-blue-100">
              Accounts Receivable Insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-[#244BA6] px-3 py-1.5 text-xs font-medium sm:inline-block">
            {currentUser?.role
              ? currentUser.role.charAt(0).toUpperCase() +
                currentUser.role.slice(1)
              : "User"}
          </span>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            {currentUser?.name?.charAt(0)?.toUpperCase() ||
              currentUser?.email?.charAt(0)?.toUpperCase() ||
              "U"}
          </div>

          <button
            type="button"
            onClick={() => {
              logoutUser();
              setActiveSection("Dashboard");
              queryClient.clear();
              setCurrentUser(null);
            }}
            className="rounded-lg border border-[#C9D2E4] px-3 py-2 text-sm font-medium text-[#F1F4FA] hover:bg-[#244BA6]"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-[#C9D2E4] bg-white p-4 md:block">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#595959]">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigationItems.map(({ label, icon: Icon }, index) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  index === 0
                    ? "bg-[#244BA6] text-white"
                    : "text-[#595959] hover:bg-[#F1F4FA] hover:text-[#244BA6]"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-[#C9D2E4] pt-4">
            {currentUser?.role?.toLowerCase() === "admin" && (
              <button
                type="button"
                onClick={() => setActiveSection("Settings")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                  activeSection === "Settings"
                    ? "bg-[#244BA6] text-white"
                    : "text-[#595959] hover:bg-[#F1F4FA]"
                }`}
              >
                <Settings size={18} />
                Settings
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {activeSection === "Settings" &&
          currentUser?.role?.toLowerCase() === "admin" ? (
            <UserManagement />
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Accounts Receivable
                  </h2>
                  <p className="mt-1 text-sm text-[#595959]">
                    Monitor outstanding invoices and collection performance.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#C9D2E4] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#F1F4FA]"
                >
                  <Search size={16} />
                  Search workspace
                </button>
              </div>

              {/* KPI placeholders */}

              <section
                aria-label="Accounts receivable key performance indicators"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {isError ? (
                  <div
                    role="alert"
                    className="col-span-full rounded-lg border border-red-300 bg-white p-4 text-sm text-red-700"
                  >
                    {error.message}
                  </div>
                ) : (
                  [
                    {
                      label: "Total invoiced",
                      value: summary
                        ? `$${Number(summary.totalInvoiced).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : null,
                    },
                    {
                      label: "Outstanding amount",
                      value: summary
                        ? `$${Number(summary.outstandingAmount).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : null,
                    },
                    {
                      label: "Overdue amount",
                      value: summary
                        ? `$${Number(summary.overdueAmount).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : null,
                    },
                    {
                      label: "Dispute rate",
                      value: summary
                        ? `${Number(summary.disputeRate).toFixed(2)}%`
                        : null,
                    },
                  ].map(({ label, value }) => (
                    <article
                      key={label}
                      className="rounded-xl border border-[#C9D2E4] bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm font-medium text-[#595959]">
                        {label}
                      </p>
                      <p className="mt-3 text-2xl font-bold text-[#262626]">
                        {isPending ? "Loading…" : value}
                      </p>
                      <p className="mt-2 text-xs text-[#595959]">
                        {isPending
                          ? "Fetching data"
                          : "Based on the current dataset"}
                      </p>
                    </article>
                  ))
                )}
              </section>

              <div className="my-6">
                <AgingChart
                  data={agingData}
                  loading={agingLoading}
                  error={agingError?.message}
                />
              </div>

              <div className="mb-6">
                <SettlementTrendChart
                  data={settlementTrendData}
                  loading={settlementTrendLoading}
                  error={settlementTrendError?.message}
                />
              </div>

              <div className="mb-6">
                <CustomerExposureChart
                  data={customerExposureData}
                  loading={customerExposureLoading}
                  error={customerExposureError?.message}
                />
              </div>

              <div className="mb-6">
                <BillingInsightsChart
                  data={billingInsightsData}
                  loading={billingInsightsLoading}
                  error={billingInsightsError?.message}
                />
              </div>

              {canUploadData && (
                <InvoiceImportPanel
                  onImported={() => {
                    queryClient.invalidateQueries();
                    setSelectedInvoiceNumbers([]);
                  }}
                />
              )}

              {/* Workspace placeholder */}

              <section className="overflow-hidden rounded-xl border border-[#C9D2E4] bg-white mt-5">
                <div className="border-b border-[#C9D2E4] p-5">
                  <h2 className="text-lg font-bold text-[#262626]">
                    Invoice workspace
                  </h2>
                  <p className="mt-1 text-sm text-[#595959]">
                    Review invoices and their current settlement status.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 px-5 pb-4">
                  <div className="w-full sm:max-w-md">
                    <label
                      htmlFor="invoice-search"
                      className="mb-1 block text-sm font-medium text-[#262626]"
                    >
                      Search invoices
                    </label>

                    <input
                      id="invoice-search"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Invoice number or customer ID..."
                      className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm outline-none focus:border-[#244BA6] focus:ring-2 focus:ring-[#244BA6]/20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                    }}
                    disabled={!searchInput && !search}
                    className="rounded-lg border border-[#C9D2E4] bg-white px-4 py-2 text-sm font-medium text-[#244BA6] hover:bg-[#F1F4FA] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear search
                  </button>
                </div>

                {search && (
                  <p className="px-5 pb-4 text-sm text-[#595959]" role="status">
                    Showing results for{" "}
                    <span className="font-semibold text-[#262626]">
                      {search}
                    </span>
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label
                      htmlFor="settlement-filter"
                      className="mb-1 block text-sm font-medium"
                    >
                      Settlement status
                    </label>
                    <select
                      id="settlement-filter"
                      value={settlementStatus}
                      onChange={(event) => {
                        setSettlementStatus(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All statuses</option>
                      <option value="outstanding">Outstanding</option>
                      <option value="settled">Settled</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="disputed-filter"
                      className="mb-1 block text-sm font-medium"
                    >
                      Dispute status
                    </label>

                    <select
                      id="disputed-filter"
                      value={disputed}
                      onChange={(event) => {
                        setDisputed(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All invoices</option>
                      <option value="true">Disputed</option>
                      <option value="false">Not disputed</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="country-filter"
                      className="mb-1 block text-sm font-medium"
                    >
                      Country code
                    </label>
                    <select
                      id="country-filter"
                      value={countryCode}
                      onChange={(event) => {
                        setCountryCode(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All countries</option>
                      <option value="391">391</option>
                      <option value="406">406</option>
                      <option value="770">770</option>
                      <option value="818">818</option>
                      <option value="897">897</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="billing-filter"
                      className="mb-1 block text-sm font-medium"
                    >
                      Billing type
                    </label>
                    <select
                      id="billing-filter"
                      value={billingType}
                      onChange={(event) => {
                        setBillingType(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">All billing types</option>
                      <option value="Paper">Paper</option>
                      <option value="Electronic">Electronic</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-[#C9D2E4] px-5 py-4 sm:grid-cols-2">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#262626]">
                      Invoice date range
                    </legend>

                    <div>
                      <label
                        htmlFor="invoice-date-from"
                        className="mb-1 block text-sm"
                      >
                        From
                      </label>
                      <input
                        id="invoice-date-from"
                        type="date"
                        value={invoiceDateFrom}
                        max={invoiceDateTo || undefined}
                        onChange={(event) => {
                          setInvoiceDateFrom(event.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="invoice-date-to"
                        className="mb-1 block text-sm"
                      >
                        To
                      </label>
                      <input
                        id="invoice-date-to"
                        type="date"
                        value={invoiceDateTo}
                        min={invoiceDateFrom || undefined}
                        onChange={(event) => {
                          setInvoiceDateTo(event.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#262626]">
                      Due date range
                    </legend>

                    <div>
                      <label
                        htmlFor="due-date-from"
                        className="mb-1 block text-sm"
                      >
                        From
                      </label>
                      <input
                        id="due-date-from"
                        type="date"
                        value={dueDateFrom}
                        max={dueDateTo || undefined}
                        onChange={(event) => {
                          setDueDateFrom(event.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="due-date-to"
                        className="mb-1 block text-sm"
                      >
                        To
                      </label>
                      <input
                        id="due-date-to"
                        type="date"
                        value={dueDateTo}
                        min={dueDateFrom || undefined}
                        onChange={(event) => {
                          setDueDateTo(event.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </fieldset>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-[#C9D2E4] px-5 py-4 sm:grid-cols-2">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#262626]">
                      Invoice amount (USD)
                    </legend>

                    <div>
                      <label
                        htmlFor="amount-min"
                        className="mb-1 block text-sm"
                      >
                        Minimum amount
                      </label>
                      <input
                        id="amount-min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountMin}
                        onChange={(event) => {
                          setAmountMin(event.target.value);
                          setPage(1);
                        }}
                        placeholder="e.g. 100"
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="amount-max"
                        className="mb-1 block text-sm"
                      >
                        Maximum amount
                      </label>
                      <input
                        id="amount-max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountMax}
                        onChange={(event) => {
                          setAmountMax(event.target.value);
                          setPage(1);
                        }}
                        placeholder="e.g. 1000"
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#262626]">
                      Days late
                    </legend>

                    <div>
                      <label
                        htmlFor="days-late-min"
                        className="mb-1 block text-sm"
                      >
                        Minimum days late
                      </label>
                      <input
                        id="days-late-min"
                        type="number"
                        min="0"
                        step="1"
                        value={daysLateMin}
                        onChange={(event) => {
                          setDaysLateMin(event.target.value);
                          setPage(1);
                        }}
                        placeholder="e.g. 31"
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="days-late-max"
                        className="mb-1 block text-sm"
                      >
                        Maximum days late
                      </label>
                      <input
                        id="days-late-max"
                        type="number"
                        min="0"
                        step="1"
                        value={daysLateMax}
                        onChange={(event) => {
                          setDaysLateMax(event.target.value);
                          setPage(1);
                        }}
                        placeholder="e.g. 90"
                        className="w-full rounded-lg border border-[#C9D2E4] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </fieldset>
                </div>

                {(search ||
                  settlementStatus ||
                  countryCode ||
                  billingType ||
                  disputed ||
                  invoiceDateFrom ||
                  invoiceDateTo ||
                  dueDateFrom ||
                  dueDateTo ||
                  amountMin ||
                  amountMax ||
                  daysLateMin ||
                  daysLateMax) && (
                  <div className="flex flex-wrap items-center gap-2 px-5 pb-5">
                    <span className="text-sm font-medium text-[#595959]">
                      Active filters:
                    </span>

                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setSearch("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Search: {search} ×
                      </button>
                    )}

                    {settlementStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementStatus("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Status: {settlementStatus} ×
                      </button>
                    )}

                    {disputed !== "" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDisputed("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Dispute:{" "}
                        {disputed === "true" ? "Disputed" : "Not disputed"} ×
                      </button>
                    )}

                    {countryCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setCountryCode("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Country: {countryCode} ×
                      </button>
                    )}

                    {billingType && (
                      <button
                        type="button"
                        onClick={() => {
                          setBillingType("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Billing: {billingType} ×
                      </button>
                    )}

                    {(invoiceDateFrom || invoiceDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceDateFrom("");
                          setInvoiceDateTo("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Invoice date: {invoiceDateFrom || "Any"} –{" "}
                        {invoiceDateTo || "Any"} ×
                      </button>
                    )}

                    {(dueDateFrom || dueDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDueDateFrom("");
                          setDueDateTo("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Due date: {dueDateFrom || "Any"} – {dueDateTo || "Any"}{" "}
                        ×
                      </button>
                    )}

                    {(amountMin || amountMax) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAmountMin("");
                          setAmountMax("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Amount: {amountMin || "0"} – {amountMax || "No limit"} ×
                      </button>
                    )}

                    {(daysLateMin || daysLateMax) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDaysLateMin("");
                          setDaysLateMax("");
                          setPage(1);
                        }}
                        className="rounded-full border border-[#C9D2E4] bg-white px-3 py-1 text-sm hover:bg-[#F1F4FA]"
                      >
                        Days late: {daysLateMin || "0"} –{" "}
                        {daysLateMax || "No limit"} ×
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setSearch("");
                        setSettlementStatus("");
                        setDisputed("");
                        setCountryCode("");
                        setBillingType("");
                        setInvoiceDateFrom("");
                        setInvoiceDateTo("");
                        setDueDateFrom("");
                        setDueDateTo("");
                        setAmountMin("");
                        setAmountMax("");
                        setDaysLateMin("");
                        setDaysLateMax("");
                        setPage(1);
                      }}
                      disabled={
                        !searchInput &&
                        !search &&
                        !settlementStatus &&
                        !disputed &&
                        !countryCode &&
                        !billingType &&
                        !invoiceDateFrom &&
                        !invoiceDateTo &&
                        !dueDateFrom &&
                        !dueDateTo &&
                        !amountMin &&
                        !amountMax &&
                        !daysLateMin &&
                        !daysLateMax
                      }
                      className="rounded-lg border border-[#C9D2E4] bg-white px-4 py-2 text-sm font-medium text-[#244BA6] hover:bg-[#F1F4FA] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}

                {invoicesLoading ? (
                  <p className="p-5 text-sm text-[#595959]" role="status">
                    Loading invoices…
                  </p>
                ) : invoicesError ? (
                  <p className="p-5 text-sm text-red-700" role="alert">
                    {invoicesErrorDetails.message}
                  </p>
                ) : (
                  <>
                    {canBulkUpdate && (
                      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#C9D2E4] bg-white p-4 m-4">
                        <span className="font-medium">
                          {selectedInvoiceNumbers.length} invoice(s) selected
                        </span>

                        <select
                          value={bulkWorkflowStatus}
                          onChange={(event) =>
                            setBulkWorkflowStatus(event.target.value)
                          }
                          className="rounded-md border border-[#C9D2E4] px-3 py-2"
                          aria-label="Bulk workflow status"
                        >
                          <option value="open">Open</option>
                          <option value="in_dispute">In dispute</option>
                          <option value="escalated">Escalated</option>
                          <option value="promised">Promised</option>
                          <option value="settled">Settled</option>
                          <option value="written_off">Written off</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleBulkUpdate}
                          disabled={
                            selectedInvoiceNumbers.length === 0 || isBulkSaving
                          }
                          className="rounded-md bg-[#244BA6] px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBulkSaving ? "Saving..." : "Apply to selected"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceNumbers([]);
                            setBulkMessage("");
                          }}
                          className="rounded-md border border-[#C9D2E4] px-4 py-2"
                        >
                          Clear selection
                        </button>

                        {bulkMessage && (
                          <p role="status" className="w-full text-sm">
                            {bulkMessage}
                          </p>
                        )}
                      </div>
                    )}

                    {canExportCurrentView && (
                      <div className="m-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className="rounded-md border border-[#244BA6] px-4 py-2 font-medium text-[#244BA6] hover:bg-[#F1F4FA]"
                        >
                          Export CSV
                        </button>

                        <button
                          type="button"
                          onClick={handleExportExcel}
                          className="rounded-md border border-[#244BA6] px-4 py-2 font-medium text-[#244BA6] hover:bg-[#F1F4FA]"
                        >
                          Export Excel
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F1F4FA] text-[#262626]">
                          <tr>
                            {canBulkUpdate && (
                              <th className="whitespace-nowrap px-4 py-3">
                                <input
                                  type="checkbox"
                                  aria-label="Select all invoices on this page"
                                  checked={
                                    invoices.length > 0 &&
                                    invoices.every((invoice) =>
                                      selectedInvoiceNumbers.includes(
                                        invoice.invoice_number,
                                      ),
                                    )
                                  }
                                  onChange={toggleCurrentPageSelection}
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </th>
                            )}
                            <th className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("invoiceNumber");
                                  setSortOrder((current) =>
                                    sortBy === "invoiceNumber" &&
                                    current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Invoice number
                                {sortBy === "invoiceNumber" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                            <th className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("customerID");
                                  setSortOrder((current) =>
                                    sortBy === "customerID" && current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Customer
                                {sortBy === "customerID" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                            <th className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("invoiceDate");
                                  setSortOrder((current) =>
                                    sortBy === "invoiceDate" &&
                                    current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Invoice date
                                {sortBy === "invoiceDate" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                            <th className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("dueDate");
                                  setSortOrder((current) =>
                                    sortBy === "dueDate" && current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Due date
                                {sortBy === "dueDate" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("invoiceAmount");
                                  setSortOrder((current) =>
                                    sortBy === "invoiceAmount" &&
                                    current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Amount
                                {sortBy === "invoiceAmount" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                            <th className="whitespace-nowrap px-4 py-3">
                              Status
                            </th>
                            <th className="whitespace-nowrap px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSortBy("daysLate");
                                  setSortOrder((current) =>
                                    sortBy === "daysLate" && current === "asc"
                                      ? "desc"
                                      : "asc",
                                  );
                                  setPage(1);
                                }}
                                className="font-semibold hover:text-[#244BA6]"
                              >
                                Days late
                                {sortBy === "daysLate" &&
                                  (sortOrder === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#C9D2E4]">
                          {invoices.map((invoice) => (
                            <tr
                              key={invoice.invoice_number}
                              onClick={() =>
                                setSelectedInvoiceNumber(invoice.invoice_number)
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setSelectedInvoiceNumber(
                                    invoice.invoice_number,
                                  );
                                }
                              }}
                              tabIndex={0}
                              aria-label={`Open invoice ${invoice.invoice_number}`}
                              className="cursor-pointer hover:bg-[#F1F4FA] focus-visible:outline-2 focus-visible:outline-[#244BA6]"
                            >
                              {canBulkUpdate && (
                                <td className="whitespace-nowrap px-4 py-3">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select invoice ${invoice.invoice_number}`}
                                    checked={selectedInvoiceNumbers.includes(
                                      invoice.invoice_number,
                                    )}
                                    onChange={() =>
                                      toggleInvoiceSelection(
                                        invoice.invoice_number,
                                      )
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                </td>
                              )}
                              <td className="whitespace-nowrap px-4 py-3 font-medium">
                                {invoice.invoice_number}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {invoice.customer_id}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {invoice.invoice_date}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {invoice.due_date}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                {Number(invoice.invoice_amount).toLocaleString(
                                  "en-US",
                                  {
                                    style: "currency",
                                    currency: "USD",
                                  },
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {invoice.settlement_status}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                {invoice.days_late_calculated}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#C9D2E4] p-4">
                      <p className="text-sm text-[#595959]">
                        {pagination
                          ? `Showing ${invoices.length} of ${pagination.total} invoices`
                          : ""}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!pagination || page <= 1}
                          onClick={() => setPage((current) => current - 1)}
                          className="rounded-md border border-[#C9D2E4] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>

                        <span className="text-sm text-[#262626]">
                          Page {pagination?.page ?? page} of{" "}
                          {pagination?.totalPages ?? 1}
                        </span>

                        <button
                          type="button"
                          disabled={
                            !pagination || page >= pagination.totalPages
                          }
                          onClick={() => setPage((current) => current + 1)}
                          className="rounded-md border border-[#C9D2E4] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedInvoiceNumber && (
        <InvoiceDetailsPanel
          invoiceNumber={selectedInvoiceNumber}
          onClose={() => setSelectedInvoiceNumber(null)}
        />
      )}
    </div>
  );
}

export default App;
