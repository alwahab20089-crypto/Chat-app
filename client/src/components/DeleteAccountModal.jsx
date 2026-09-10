export default function DeleteAccountModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-neon-fuchsia/20 bg-cyberslate p-6 shadow-glow-fuchsia-lg">
        <h2 className="font-display text-lg font-semibold text-white">Delete your account?</h2>
        <p className="mt-2 text-sm text-gray-400">This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-300 ease-premium hover:bg-cyberslate-light hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-neon-fuchsia px-4 py-2 text-sm font-medium text-white transition-all duration-300 ease-premium hover:bg-neon-fuchsia-bright hover:shadow-glow-fuchsia"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}