import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import { forgotPassword } from '../api/authApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('If an account exists, a reset code has been sent');
      navigate('/verify-reset-otp', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Forgot password</h1>
      <p className="mb-6 text-center text-sm text-gray-400">
        Enter your registered email and we'll send you a reset code
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20"
            disabled={loading}
          />
          {error && <p className="mt-1 text-xs text-neon-fuchsia-bright">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send OTP
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Remembered your password?{' '}
        <Link
          to="/sign-in"
          className="font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}