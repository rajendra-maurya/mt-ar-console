import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function AgingChart({
  data = [],
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <p className="p-4 text-sm text-[#595959]">Loading aging analysis...</p>
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
      <p className="p-4 text-sm text-[#595959]">No aging data available.</p>
    );
  }

  const chartData = data.map((item) => ({
    agingBucket: item.agingBucket,
    amount: Number(item.outstandingAmount ?? 0),
  }));

  return (
    <section className="rounded-xl border border-[#C9D2E4] bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-[#262626]">
        Outstanding invoice aging
      </h2>

      <p className="mb-4 text-sm text-[#595959]">
        Outstanding value by days overdue (USD)
      </p>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="agingBucket" tick={{ fontSize: 11 }} interval={0} />

            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                `$${Number(value).toLocaleString("en-US")}`
              }
            />

            <Tooltip
              formatter={(value) => [
                Number(value).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                }),
                "Outstanding amount",
              ]}
            />

            <Bar dataKey="amount" fill="#244BA6" name="Outstanding amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
