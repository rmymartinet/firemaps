export default function Loading() {
  return (
    <main
      aria-label="Chargement de l’application"
      aria-live="polite"
      className="fixed inset-0 z-[5000] grid place-items-center bg-white"
      role="status"
    >
      <div className="grid place-items-center gap-5">
        <video
          aria-label="Logo Sentinel animé"
          autoPlay
          className="size-[clamp(170px,34vw,280px)] object-contain"
          loop
          muted
          playsInline
          preload="auto"
          src="/logo.mp4"
        />
        <span aria-hidden className="relative h-5 min-w-[280px] whitespace-nowrap text-center text-sm font-black tracking-[.14em] text-[#172322] uppercase">
          <span className="loading-message loading-message-first">Chargement de la carte…</span>
          <span className="loading-message loading-message-second">Protégeons nos forêts</span>
        </span>
      </div>
    </main>
  );
}
