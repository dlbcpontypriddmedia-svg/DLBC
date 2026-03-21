import LoadingSpinner from "@/components/LoadingSpinner";
import Logo from "@/components/Logo";

interface PageLoaderProps {
  label?: string;
}

const PageLoader = ({ label = "Loading your workspace..." }: PageLoaderProps) => (
  <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
    <div className="surface-panel w-full max-w-2xl overflow-hidden px-6 py-7 shadow-[0_28px_80px_-36px_rgba(12,38,74,0.42)] sm:px-8 sm:py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-center sm:justify-start">
          <Logo />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/10 bg-white/80 shadow-sm">
            <LoadingSpinner size="lg" className="text-primary" />
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xl font-semibold text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">The page is getting everything ready.</p>
          </div>

          <div className="mt-6 w-full max-w-xs overflow-hidden rounded-full bg-primary/10">
            <div className="h-1.5 w-1/2 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PageLoader;
