import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  compact?: boolean;
}

const Logo = ({ className = "", compact = false }: LogoProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <div className="brand-seal shrink-0" aria-hidden="true">
      <div className="brand-seal__ring">
        <div className="brand-seal__field">
          <div className="brand-seal__cross brand-seal__cross--vertical" />
          <div className="brand-seal__cross brand-seal__cross--horizontal" />
          <div className="brand-seal__glow" />
          <div className="brand-seal__book">
            <span className="brand-seal__page brand-seal__page--left" />
            <span className="brand-seal__page brand-seal__page--right" />
          </div>
        </div>
      </div>
    </div>

    {!compact && (
      <div className="min-w-0 leading-tight">
        <p className="font-display text-lg font-semibold uppercase tracking-[0.28em] text-primary">
          Deeper Life
        </p>
        <p className="text-sm font-semibold text-foreground">Bible Church</p>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Attendance Streaming Portal
        </p>
      </div>
    )}
  </div>
);

export default Logo;
