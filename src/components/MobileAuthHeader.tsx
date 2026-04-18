const MobileAuthHeader = () => (
  <div className="brand-gradient lg:hidden flex items-center gap-3 px-5 py-4">
    <img
      src="/church-logo.jpg"
      alt="DLBC"
      className="h-10 w-10 shrink-0 rounded-full border-2 border-white/20 object-cover"
    />
    <div>
      <p className="font-display text-sm font-semibold leading-tight text-white">
        Deeper Life Bible Church
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/45">
        Attendance Portal
      </p>
    </div>
  </div>
);

export default MobileAuthHeader;
