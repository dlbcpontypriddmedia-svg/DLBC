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
      className="h-14 w-14 shrink-0 rounded-full border border-primary/10 object-cover shadow-[0_14px_24px_-18px_rgba(19,63,112,0.85)]"
    />

    {!compact && (
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
          Deeper Life Bible Church
        </p>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Attendance Streaming Portal
        </p>
      </div>
    )}
  </div>
);

export default Logo;
