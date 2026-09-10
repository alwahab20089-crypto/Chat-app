import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import { verifyEmailOtp, resendOtp } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const email = state?.email;
  const [digits, setDigits] = useState(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  if (!email) {
    navigate('/sign-up');
    return null;
  }

  const handleChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyEmailOtp({ email, code });
      setUser(data.user);
      toast.success('Email verified successfully');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendOtp(email);
      toast.success('A new code has been sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Verify your email</h1>
      <p className="mb-6 text-center text-sm text-gray-400">We sent a verification code to {email}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              inputMode="numeric"
              className={`h-12 w-11 rounded-xl border bg-cyberslate text-center text-lg font-semibold text-white outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20 ${
                d ? 'scale-105 border-neon-aqua/40' : 'border-cyberslate-light'
              }`}
              disabled={loading}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify email
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Didn't receive the code?{' '}
        <button
          onClick={handleResend}
          disabled={resending}
          className="font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua disabled:opacity-60"
        >
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </p>
    </AuthCard>
  );
}