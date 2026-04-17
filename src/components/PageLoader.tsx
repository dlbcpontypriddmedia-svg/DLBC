interface PageLoaderProps {
  label?: string;
}

const PageLoader = ({ label }: PageLoaderProps) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center"
    style={{
      background: "linear-gradient(160deg, #0b2347 0%, #0f3568 40%, #133d7a 70%, #0e2d5a 100%)",
    }}
  >
    {/* Subtle grid */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />

    {/* Glow blobs */}
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #eab308 0%, transparent 70%)" }}
      />
    </div>

    {/* Logo ring */}
    <div className="relative mb-8 flex items-center justify-center">
      {/* Spinning arc */}
      <svg
        className="absolute h-28 w-28 animate-spin"
        style={{ animationDuration: "2.4s" }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="44" stroke="white" strokeOpacity="0.08" strokeWidth="2" />
        <path
          d="M 50 6 A 44 44 0 0 1 94 50"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {/* Church logo */}
      <img
        src="/church-logo.jpg"
        alt="DLBC"
        className="h-20 w-20 rounded-full border-2 object-cover"
        style={{ borderColor: "rgba(255,255,255,0.18)" }}
      />
    </div>

    {/* Text */}
    <h1
      className="font-display text-xl font-semibold text-white"
      style={{ fontFamily: "'Cinzel', serif" }}
    >
      Deeper Life Bible Church
    </h1>
    {label && (
      <p className="mt-2 text-sm text-white/40">{label}</p>
    )}

    {/* Bottom bar */}
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-white/25"
            style={{
              animation: "dotPulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.22}s`,
            }}
          />
        ))}
      </div>
    </div>

    <style>{`
      @keyframes dotPulse {
        0%, 80%, 100% { opacity: 0.2; transform: scale(1); }
        40% { opacity: 1; transform: scale(1.5); }
      }
    `}</style>
  </div>
);

export default PageLoader;
