import LoadingSpinner from "@/components/LoadingSpinner";
import Logo from "@/components/Logo";

interface PageLoaderProps {
  label?: string;
}

const PageLoader = ({ label = "Loading your workspace..." }: PageLoaderProps) => (
  <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
    <div className="surface-panel flex w-full max-w-md flex-col items-center gap-5 px-8 py-10 text-center shadow-[0_24px_70px_-32px_rgba(12,38,74,0.55)]">
      <Logo />
      <div className="space-y-2">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Please wait</p>
      </div>
    </div>
  </div>
);

export default PageLoader;
