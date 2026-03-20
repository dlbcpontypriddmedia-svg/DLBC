import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

interface LoadingSpinnerProps {
  className?: string;
  size?: keyof typeof sizeMap;
}

const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => (
  <Loader2 className={cn("animate-spin text-primary", sizeMap[size], className)} />
);

export default LoadingSpinner;
