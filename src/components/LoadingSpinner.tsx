import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const dotSize = size === "sm" ? "h-1 w-1" : size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5";
  const gap = size === "sm" ? "gap-1" : "gap-1.5";

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("rounded-full bg-current", dotSize)}
          style={{
            animation: "dotBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </span>
  );
};

export default LoadingSpinner;
