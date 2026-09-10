export default function AuthCard({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-obsidian via-obsidian to-cyberslate/40 px-4 py-10">
      <div className="w-full max-w-md animate-fade-in-up rounded-2xl border border-neon-aqua/15 bg-cyberslate/80 p-8 shadow-glow-aqua-lg backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}