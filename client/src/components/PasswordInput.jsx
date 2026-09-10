import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ value, onChange, disabled, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 pr-11 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-200 ease-premium hover:scale-110 hover:text-neon-aqua-bright disabled:opacity-50"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}