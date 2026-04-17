const MobileAuthHeader = () => (
  <div
    className="lg:hidden flex items-center gap-3 px-5 py-4"
    style={{
      background: "linear-gradient(135deg, #0b2347 0%, #0f3568 60%, #133d7a 100%)",
    }}
  >
    <img
      src="/church-logo.jpg"
      alt="DLBC"
      className="h-10 w-10 shrink-0 rounded-full border-2 object-cover"
      style={{ borderColor: "rgba(255,255,255,0.2)" }}
    />
    <div>
      <p
        className="text-sm font-semibold leading-tight text-white"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Deeper Life Bible Church
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/45">
        Attendance Portal
      </p>
    </div>
  </div>
);

export default MobileAuthHeader;
