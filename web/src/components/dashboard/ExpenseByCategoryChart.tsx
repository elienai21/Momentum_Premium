import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseByCategoryChartProps {
  transactions: Array<{
    amount: number;
    type: "credit" | "debit";
    category?: string;
  }>;
}

const CATEGORY_COLORS = [
  "#6e34ff", // Primary purple
  "#00c6ff", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Teal
  "#84cc16", // Lime
  "#f97316", // Orange
];

/**
 * Doughnut chart showing expense distribution by category.
 */
export function ExpenseByCategoryChart({ transactions }: ExpenseByCategoryChartProps) {
  const { labels, values, colors } = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    transactions
      .filter((tx) => tx.type === "debit")
      .forEach((tx) => {
        const cat = tx.category || "Outros";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      });

    // Sort by value descending, limit to top 8, group rest as "Outros"
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const restTotal = sorted.slice(8).reduce((sum, [, val]) => sum + val, 0);

    if (restTotal > 0) {
      const existing = top.find(([k]) => k === "Outros");
      if (existing) {
        existing[1] += restTotal;
      } else {
        top.push(["Outros", restTotal]);
      }
    }

    return {
      labels: top.map(([k]) => k),
      values: top.map(([, v]) => v),
      colors: top.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
    };
  }, [transactions]);

  if (values.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
        Sem dados de despesas para exibir
      </div>
    );
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: "#fff",
        spacing: 2,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 12,
          font: { size: 11 },
          generateLabels: (chart) => {
            const data = chart.data;
            const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
            return (data.labels as string[]).map((label, i) => {
              const value = (data.datasets[0].data as number[])[i];
              const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
              return {
                text: `${label} (${pct}%)`,
                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            const total = ctx.dataset.data.reduce((a: number, b: unknown) => a + (b as number), 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
            return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[280px] w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
