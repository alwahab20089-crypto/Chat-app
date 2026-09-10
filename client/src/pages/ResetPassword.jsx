import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';
import { resetPassword } from '../api/authApi';

export default function ResetPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email;
  const code = state?.code;
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!email || !code) {
    navigate('/forgot-password');
    return null;
  }

  const validate = () => {
    const e = {};
    if (form.newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.newPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword({ email, code, newPassword: form.newPassword });
      toast.success('Password reset successfully');
      navigate('/sign-in');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Logo />
      <h1 className="text-center font-display text-xl font-semibold text-white">Create new password</h1>
      <p className="mb-6 text-center text-sm text-gray-400">Choose a strong new password</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">New password</label>
          <PasswordInput
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            disabled={loading}
            autoComplete="new-password"
          />
          {errors.newPassword && <p className="mt-1 text-xs text-neon-fuchsia-bright">{errors.newPassword}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Confirm new password</label>
          <PasswordInput
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            disabled={loading}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-neon-fuchsia-bright">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia py-2.5 text-sm font-medium text-white shadow-glow-aqua transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-glow-fuchsia-lg disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset password
        </button>
      </form>
    </AuthCard>
  );
}