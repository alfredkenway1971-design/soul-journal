import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import type { Mood } from "./MoodSelector";

interface MoodData {
  mood: Mood;
  count: number;
}

interface InsightsChartProps {
  data: MoodData[];
  totalEntries: number;
}

const moodConfig: Record<Mood, { label: string; color: string; emoji: string }> = {
  happy: { label: "Happy", color: "hsl(45, 100%, 60%)", emoji: "😊" },
  good: { label: "Good", color: "hsl(145, 60%, 50%)", emoji: "🙂" },
  fine: { label: "Fine", color: "hsl(200, 60%, 60%)", emoji: "😐" },
  sad: { label: "Sad", color: "hsl(220, 40%, 55%)", emoji: "😔" },
  unhappy: { label: "Unhappy", color: "hsl(0, 60%, 55%)", emoji: "😢" },
};

const InsightsChart = ({ data, totalEntries }: InsightsChartProps) => {
  const chartData = data.map((item) => ({
    name: moodConfig[item.mood].label,
    value: item.count,
    color: moodConfig[item.mood].color,
    emoji: moodConfig[item.mood].emoji,
  }));

  const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
      >
        <tspan x={cx} dy="-0.5em" fontSize="28" fontWeight="600">
          {totalEntries}
        </tspan>
        <tspan x={cx} dy="1.8em" fontSize="12" className="fill-muted-foreground">
          entries
        </tspan>
      </text>
    );
  };

  return (
    <motion.div
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold mb-4">Mood Distribution</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {chartData.map((item, index) => (
          <motion.div
            key={item.name}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">
              {item.emoji} {item.name}
            </span>
            <span className="text-sm text-muted-foreground ml-auto">
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default InsightsChart;
