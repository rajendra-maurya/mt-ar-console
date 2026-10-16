import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function SettlementTrendChart({
  data = [],
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <p className="p-4 text-sm text-[#595959]">Loading settlement trend...</p>
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
        No settlement trend data available.
      </p>
    );
  }

  const chartData = [...data]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      monthLabel: item.month,
      settledInvoices: Number(item.settledInvoices ?? 0),
    }));

  return (
    <section className="rounded-xl border border-[#C9D2E4] bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-[#262626]">
        Settlement trend
      </h2>
      <p className="mb-4 text-sm text-[#595959]">
        Number of invoices settled each month
      </p>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="settledInvoices"
              name="Settled invoices"
              stroke="#4C9D2F"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
