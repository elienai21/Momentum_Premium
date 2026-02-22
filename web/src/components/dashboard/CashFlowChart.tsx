import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface CashFlowChartProps {
  /** Transaction data with date, amount, and type */
  transactions: Array<{
    date: string;
    amount: number;
    type: "credit" | "debit";
  }>;
  /** Number of days to show (default 30) */
  days?: number;
}

/**
 * Cash Flow chart showing revenue vs expenses over time.
 * Uses Chart.js Line chart with gradient fill.
 */
export function CashFlowChart({ transactions, days = 30 }: CashFlowChartProps) {
  const { labels, revenueData, expenseData } = useMemo(() => {
    const now = new Date();
    const dateMap: Record<string, { revenue: number; expense: number }> = {};

    // Initialize all dates
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { revenue: 0, expense: 0 };
    }

    // Aggregate transactions
    transactions.forEach((tx) => {
      const key = tx.date?.slice(0, 10);
      if (dateMap[key]) {
        if (tx.type === "credit") {
          dateMap[key].revenue += tx.amount;
        } else {
          dateMap[key].expense += tx.amount;
        }
      }
    });

    const sortedKeys = Object.keys(dateMap).sort();
    return {
      labels: sortedKeys.map((k) => {
        const [, m, d] = k.split("-");
        return `${d}/${m}`;
      }),
      revenueData: sortedKeys.map((k) => dateMap[k].revenue),
      expenseData: sortedKeys.map((k) => dateMap[k].expense),
    };
  }, [transactions, days]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Receita",
        data: revenueData,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Despesas",
        data: expenseData,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.05)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: { size: 11, weight: "bold" },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            return `${ctx.dataset.label}: R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          maxTicksLimit: 10,
          color: "#94a3b8",
        },
      },
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
        },
        ticks: {
          font: { size: 10 },
          color: "#94a3b8",
          callback: (value) => `R$ ${Number(value).toLocaleString("pt-BR")}`,
        },
      },
    },
  };

  return (
    <div className="h-[280px] w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
