import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  color?: "orange" | "red" | "green" | "blue" | "purple";
}

const colorMap = {
  orange: "bg-primary-50 text-primary-600",
  red: "bg-accent-50 text-accent-600",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
};

export default function StatCard({
  title,
  value,
  icon,
  change,
  changeType = "neutral",
  color = "orange",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {change && (
            <p
              className={`text-xs mt-2 font-medium ${
                changeType === "up"
                  ? "text-green-600"
                  : changeType === "down"
                  ? "text-accent-600"
                  : "text-muted"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
