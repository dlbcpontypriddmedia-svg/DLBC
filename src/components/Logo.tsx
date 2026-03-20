const Logo = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
      <span className="text-lg font-bold text-primary-foreground">DL</span>
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-sm font-bold tracking-tight text-foreground">Deeper Life</span>
      <span className="text-xs text-muted-foreground">Bible Church Streaming</span>
    </div>
  </div>
);

export default Logo;
