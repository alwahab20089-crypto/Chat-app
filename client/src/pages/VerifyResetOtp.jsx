import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import { verifyResetOtp } from '../api/authApi';

export default function VerifyResetOtp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    navigate('/forgot-password');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtp({ email, code });
      navigate('/reset-password', { state: { email, code } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Verify reset code</h1>
      <p className="mb-6 text-center text-sm text-gray-400">Enter the code sent to {email}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          value={code}
          onChange={(e) => /^\d{0,6}$/.test(e.target.value) && setCode(e.target.value)}
          inputMode="numeric"
          placeholder="••••••"
          className="w-full rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 text-center text-lg tracking-[0.5em] text-white outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify OTP
        </button>
      </form>
    </AuthCard>
  );
}