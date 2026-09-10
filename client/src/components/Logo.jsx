export default function Logo() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2.5 group">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-aqua to-neon-fuchsia font-display font-bold text-white shadow-glow-aqua transition-all duration-300 ease-premium group-hover:shadow-glow-fuchsia-lg group-hover:scale-105">
        <span className="relative z-10">A</span>
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-aqua to-neon-fuchsia opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70" />
      </div>
      <span className="font-display text-xl font-semibold tracking-tight text-white">
        AURA
      </span>
    </div>
  );
}