import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      setUser(data.user);
      toast.success('Welcome back!');
      navigate('/profile');
    } catch (err) {
      const res = err.response?.data;
      if (res?.requiresVerification) {
        toast.info('Please verify your email first');
        navigate('/verify-email', { state: { email: res.email } });
        return;
      }
      toast.error(res?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Welcome back</h1>
      <p className="mb-6 text-center text-sm text-gray-400">Sign in to continue to AURA</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20"
            disabled={loading}
          />
          {errors.email && <p className="mt-1 text-xs text-neon-fuchsia-bright">{errors.email}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={loading}
            autoComplete="current-password"
          />
          {errors.password && <p className="mt-1 text-xs text-neon-fuchsia-bright">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-cyberslate-light" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-cyberslate-light" />
      </div>

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link
          to="/sign-up"
          className="font-medium text-neon-aqua-bright transition-colors duration-200 ease-premium hover:text-neon-aqua"
        >
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}