import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  compact?: boolean;
}

const Logo = ({ className = "", compact = false }: LogoProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <img
      src="/church-logo.jpg"
      alt="Deeper Life Bible Church logo"
      className="h-11 w-11 shrink-0 rounded-full border border-primary/10 object-cover shadow-[0_14px_24px_-18px_rgba(19,63,112,0.85)] sm:h-14 sm:w-14"
    />

    {!compact && (
      <div className="min-w-0">
        <p className="font-display text-base font-semibold text-foreground sm:text-xl">
          Deeper Life Bible Church
        </p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">
          Attendance Streaming Portal
        </p>
      </div>
    )}
  </div>
);

export default Logo;
