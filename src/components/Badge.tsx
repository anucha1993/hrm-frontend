interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "default";
}

const variantClasses = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  default: "bg-gray-50 text-gray-700 ring-gray-600/20",
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
