import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function CustomerExposureChart({
  data = [],
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <p className="p-4 text-sm text-[#595959]">Loading customer exposure...</p>
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
        No outstanding customer exposure found.
      </p>
    );
  }

  const chartData = [...data]
    .sort((a, b) => Number(b.outstandingAmount) - Number(a.outstandingAmount))
    .slice(0, 10)
    .map((item) => ({
      customerID: item.customerID,
      outstandingAmount: Number(item.outstandingAmount ?? 0),
      outstandingInvoices: Number(item.outstandingInvoices ?? 0),
      averageDaysLate: Number(item.averageDaysLate ?? 0),
    }));

  return (
    <section className="rounded-xl border border-[#C9D2E4] bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-[#262626]">
        Top 10 customers by outstanding amount
      </h2>
      <p className="mb-4 text-sm text-[#595959]">
        Outstanding exposure in USD. Hover over a bar for invoice count and
        average days late.
      </p>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                `$${Number(value).toLocaleString("en-US")}`
              }
            />
            <YAxis
              type="category"
              dataKey="customerID"
              width={100}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "Outstanding amount") {
                  return [
                    Number(value).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    }),
                    name,
                  ];
                }

                return [value, name];
              }}
              labelFormatter={(customerID) => {
                const customer = chartData.find(
                  (item) => item.customerID === customerID,
                );

                return customer
                  ? `${customerID} · ${customer.outstandingInvoices} invoices · ${customer.averageDaysLate} days late on average`
                  : customerID;
              }}
            />
            <Bar
              dataKey="outstandingAmount"
              fill="#244BA6"
              name="Outstanding amount"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
