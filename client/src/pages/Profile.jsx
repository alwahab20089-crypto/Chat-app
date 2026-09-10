// src/pages/Profile.jsx
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Pencil,
  LogOut,
  Mail,
  AtSign,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/sign-in');
  };

  const avatarLetter = user?.name?.[0]?.toUpperCase() || 'A';

  return (
    <div className="relative h-full overflow-y-auto bg-[#0B0C10] text-white">
      {/* Ambient cyberpunk background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-[#45A29E]/10 blur-3xl" />
        <div className="absolute right-[-120px] top-1/4 h-80 w-80 rounded-full bg-[#F64C72]/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-96 w-96 rounded-full bg-[#45A29E]/5 blur-3xl" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#45A29E 1px, transparent 1px), linear-gradient(90deg, #45A29E 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Top actions */}
        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-[#1F2833]/60 px-3.5 py-2 text-sm text-slate-400 backdrop-blur-md transition-all duration-300 hover:border-[#F64C72]/30 hover:bg-[#1F2833] hover:text-[#F64C72] hover:shadow-lg hover:shadow-[#F64C72]/5"
          >
            <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Main profile card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1F2833]/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {/* Top glow */}
          <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#45A29E] to-transparent opacity-80" />

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#45A29E]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-[#F64C72]/5 blur-3xl" />

          <div className="relative px-5 py-8 sm:px-8 sm:py-10">
            {/* Profile avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Outer neon ring */}
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#45A29E] via-[#45A29E]/50 to-[#F64C72] opacity-60 blur-md transition duration-500 group-hover:opacity-100" />

                <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[#45A29E]/70 bg-[#0B0C10] p-1 shadow-[0_0_35px_rgba(69,162,158,0.18)] sm:h-32 sm:w-32">
                  <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-[#1F2833] to-[#0B0C10]">
                    {user?.profilePicture ? (
                      <img
                        src={`${SERVER_URL}${user.profilePicture}`}
                        alt={user.name}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#45A29E]/30 to-[#F64C72]/20 text-4xl font-bold text-[#45A29E]">
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                </div>

                {/* Online indicator */}
                <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#1F2833] bg-[#45A29E] shadow-[0_0_14px_rgba(69,162,158,0.8)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>

              {/* Identity */}
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {user?.name}
                  </h1>

                  <Sparkles className="h-4 w-4 text-[#45A29E]" />
                </div>

                <p className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-[#45A29E]">
                  <AtSign className="h-3.5 w-3.5" />
                  {user?.username}
                </p>
              </div>

              {/* Bio */}
              <p className="mt-5 max-w-lg text-center text-sm leading-6 text-slate-400">
                {user?.bio || 'No bio yet. Add something about yourself.'}
              </p>
            </div>

            {/* Divider */}
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Account information */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="group rounded-2xl border border-white/5 bg-[#0B0C10]/45 p-4 transition-all duration-300 hover:border-[#45A29E]/20 hover:bg-[#0B0C10]/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#45A29E]/10 text-[#45A29E] transition duration-300 group-hover:bg-[#45A29E]/15 group-hover:shadow-[0_0_20px_rgba(69,162,158,0.1)]">
                    <Mail className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Email
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-300">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-white/5 bg-[#0B0C10]/45 p-4 transition-all duration-300 hover:border-[#45A29E]/20 hover:bg-[#0B0C10]/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#45A29E]/10 text-[#45A29E] transition duration-300 group-hover:bg-[#45A29E]/15 group-hover:shadow-[0_0_20px_rgba(69,162,158,0.1)]">
                    <AtSign className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Username
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-300">
                      @{user?.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit button */}
            <Link
              to="/dashboard/profile/edit"
              className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#45A29E]/30 bg-[#45A29E]/10 px-5 py-3.5 text-sm font-semibold text-[#45A29E] shadow-[0_0_25px_rgba(69,162,158,0.05)] transition-all duration-300 hover:border-[#45A29E]/60 hover:bg-[#45A29E]/15 hover:shadow-[0_0_30px_rgba(69,162,158,0.12)] active:scale-[0.98]"
            >
              <Pencil className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-6" />
              Edit Profile
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Small footer accent */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-600">
          <span className="h-px w-8 bg-slate-700" />
          AURA PROFILE
          <span className="h-px w-8 bg-slate-700" />
        </div>
      </div>
    </div>
  );
}