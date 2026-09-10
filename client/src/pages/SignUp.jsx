import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';
import { registerUser } from '../api/authApi';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(form);
      toast.success('Account created! Check your email for a verification code.');
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text') => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      {type === 'password' ? (
        <PasswordInput
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          disabled={loading}
          autoComplete="new-password"
        />
      ) : (
        <input
          type={type}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all duration-300 ease-premium focus:border-neon-aqua focus:shadow-glow-aqua focus:ring-2 focus:ring-neon-aqua/20"
          disabled={loading}
        />
      )}
      {errors[name] && <p className="mt-1 text-xs text-neon-fuchsia-bright">{errors[name]}</p>}
    </div>
  );

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Create your account</h1>
      <p className="mb-6 text-center text-sm text-gray-400">Start your journey with AURA</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {field('name', 'Full name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Password', 'password')}
        {field('confirmPassword', 'Confirm password', 'password')}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-cyberslate-light" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-cyberslate-light" />
      </div>

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
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