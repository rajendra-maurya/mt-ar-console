import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function BillingInsightsChart({
  data = [],
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <p className="p-4 text-sm text-[#595959]">Loading billing insights...</p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="p-4 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!data.length) {
    return (
      <p className="p-4 text-sm text-[#595959]">
        No billing insights available.
      </p>
    );
  }

  const chartData = data.map((item) => ({
    billingType: item.billingType,
    totalInvoices: Number(item.totalInvoices ?? 0),
    averageDaysLate: Number(item.averageDaysLate ?? 0),
    disputeRate: Number(item.disputeRate ?? 0),
  }));

  const formatNumber = (value) => Number(value).toLocaleString("en-US");

  return (
    <section className="rounded-xl border border-[#C9D2E4] bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-[#262626]">
        Electronic vs Paper billing
      </h2>
      <p className="mb-5 text-sm text-[#595959]">
        Compare average days late and the percentage of disputed invoices.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#262626]">
            Average days late
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="billingType" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `${formatNumber(value)} days`,
                    "Average days late",
                  ]}
                />
                <Bar
                  dataKey="averageDaysLate"
                  fill="#244BA6"
                  name="Average days late"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#262626]">
            Dispute rate
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="billingType" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value) => [
                    `${formatNumber(value)}%`,
                    "Dispute rate",
                  ]}
                />
                <Bar dataKey="disputeRate" fill="#4C9D2F" name="Dispute rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#595959]">
        Invoice counts:{" "}
        {chartData
          .map(
            (item) =>
              `${item.billingType}: ${item.totalInvoices.toLocaleString("en-US")}`,
          )
          .join(" · ")}
      </p>
    </section>
  );
}
