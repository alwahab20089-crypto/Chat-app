export default function UserResultCard({ user }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-cyberslate-light bg-cyberslate/80 p-3 backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-neon-aqua/40 hover:shadow-glow-aqua">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-obsidian bg-gradient-to-br from-neon-aqua to-neon-fuchsia shadow-sm transition-transform duration-300 ease-premium group-hover:scale-105">
        {user.profilePicture ? (
          <img
            src={`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${user.profilePicture}`}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
            {user.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-neon-aqua-bright">@{user.username}</p>
      </div>
    </div>
  );
}