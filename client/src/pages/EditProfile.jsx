// src/pages/EditProfile.jsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Camera,
  Trash2,
  Loader2,
  ArrowLeft,
  UserRound,
  AtSign,
  FileText,
  ShieldAlert,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  updateBio,
  updateUsername,
  updateName,
  uploadProfilePicture,
  removeProfilePicture,
  deleteAccount,
} from '../api/profileApi';
import DeleteAccountModal from '../components/DeleteAccountModal';

const BIO_LIMIT = 160;

export default function EditProfile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [name, setName] = useState(user?.name || '');

  const [savingBio, setSavingBio] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [nameError, setNameError] = useState('');

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const cooldownMessageFor = (lastChangedAt, label) => {
    if (!lastChangedAt) return null;

    const nextAllowed = new Date(
      new Date(lastChangedAt).getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const diff = nextAllowed - new Date();

    if (diff <= 0) return null;

    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

    return `${label} can be changed again in ${days} day${
      days === 1 ? '' : 's'
    }.`;
  };

  const cooldownMessage = () =>
    cooldownMessageFor(user?.lastUsernameChangeAt, 'Username');

  const nameCooldownMessage = () =>
    cooldownMessageFor(user?.lastNameChangeAt, 'Name');

  const handleSaveBio = async () => {
    setSavingBio(true);

    try {
      const { data } = await updateBio(bio);

      setUser(data.user);

      toast.success('Bio updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update bio');
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveName = async () => {
    setNameError('');

    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }

    setSavingName(true);

    try {
      const { data } = await updateName(name.trim());

      setUser(data.user);

      toast.success('Name updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    setUsernameError('');

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameError(
        '3-20 characters: lowercase letters, numbers, underscores'
      );
      return;
    }

    setSavingUsername(true);

    try {
      const { data } = await updateUsername(username);

      setUser(data.user);

      toast.success('Username updated');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not update username'
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG or WEBP images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploadingPicture(true);

    try {
      const { data } = await uploadProfilePicture(file);

      setUser(data.user);

      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingPicture(false);
      e.target.value = '';
    }
  };

  const handleRemovePicture = async () => {
    setUploadingPicture(true);

    try {
      const { data } = await removeProfilePicture();

      setUser(data.user);

      toast.success('Profile picture removed');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not remove picture'
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();

      await logout();

      toast.success('Account deleted');

      navigate('/sign-up');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not delete account'
      );
    }
  };

  const cooldown = cooldownMessage();
  const nameCooldown = nameCooldownMessage();

  const avatarLetter = user?.name?.[0]?.toUpperCase() || 'A';

  return (
    <div className="relative h-full overflow-y-auto bg-[#0B0C10] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#45A29E]/10 blur-3xl" />

        <div className="absolute right-[-140px] top-1/4 h-96 w-96 rounded-full bg-[#F64C72]/8 blur-3xl" />

        <div className="absolute bottom-[-160px] left-1/3 h-96 w-96 rounded-full bg-[#45A29E]/5 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#45A29E 1px, transparent 1px), linear-gradient(90deg, #45A29E 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="group mb-6 flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-400 transition-all duration-300 hover:bg-[#1F2833]/50 hover:text-[#45A29E]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to profile
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#45A29E]" />

            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#45A29E]">
              Personal settings
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Edit your profile
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Keep your AURA identity fresh and up to date.
          </p>
        </div>

        {/* Main card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1F2833]/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {/* Top neon line */}
          <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#45A29E] to-transparent" />

          {/* Card glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#45A29E]/10 blur-3xl" />

          <div className="relative p-5 sm:p-8">
            {/* Profile picture section */}
            <div className="mb-8 flex flex-col items-center">
              <div className="relative">
                {/* Neon aura */}
                <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#45A29E]/50 via-transparent to-[#F64C72]/40 blur-xl" />

                <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[#45A29E]/60 bg-[#0B0C10] p-1 shadow-[0_0_30px_rgba(69,162,158,0.15)] sm:h-32 sm:w-32">
                  <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-[#45A29E]/25 via-[#1F2833] to-[#F64C72]/20">
                    {user?.profilePicture ? (
                      <img
                        src={`${SERVER_URL}${user.profilePicture}`}
                        alt={user.name}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#45A29E]">
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                </div>

                {/* Online indicator */}
                <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#1F2833] bg-[#45A29E] shadow-[0_0_15px_rgba(69,162,158,0.8)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>

                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="absolute bottom-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#45A29E]/50 bg-[#0B0C10] text-[#45A29E] shadow-lg transition-all duration-300 hover:scale-110 hover:border-[#45A29E] hover:bg-[#45A29E]/10 hover:shadow-[0_0_20px_rgba(69,162,158,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingPicture ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                {user?.name}
              </h2>

              <p className="mt-1 text-sm text-[#45A29E]">
                @{user?.username}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="rounded-xl border border-[#45A29E]/25 bg-[#45A29E]/5 px-3.5 py-2 text-xs font-medium text-[#45A29E] transition-all duration-300 hover:border-[#45A29E]/50 hover:bg-[#45A29E]/10 disabled:opacity-50"
                >
                  Change picture
                </button>

                {user?.profilePicture && (
                  <button
                    onClick={handleRemovePicture}
                    disabled={uploadingPicture}
                    className="flex items-center gap-1.5 rounded-xl border border-[#F64C72]/20 bg-[#F64C72]/5 px-3.5 py-2 text-xs font-medium text-[#F64C72] transition-all duration-300 hover:border-[#F64C72]/40 hover:bg-[#F64C72]/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-600">
                JPG, PNG or WEBP · Maximum 5MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePictureChange}
              />
            </div>

            {/* Divider */}
            <div className="mb-7 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Name */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[#45A29E]" />

                <label className="text-sm font-semibold text-slate-200">
                  Display name
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!nameCooldown || savingName}
                    className="w-full rounded-xl border border-white/10 bg-[#0B0C10]/70 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-[#45A29E]/60 focus:bg-[#0B0C10] focus:ring-2 focus:ring-[#45A29E]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Your name"
                  />
                </div>

                <button
                  onClick={handleSaveName}
                  disabled={
                    !!nameCooldown ||
                    savingName ||
                    name.trim() === user?.name
                  }
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#45A29E] px-5 text-sm font-semibold text-[#0B0C10] transition-all duration-300 hover:bg-[#66c8c2] hover:shadow-[0_0_25px_rgba(69,162,158,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>

              {nameError && (
                <p className="mt-2 text-xs text-[#F64C72]">
                  {nameError}
                </p>
              )}

              {nameCooldown && (
                <p className="mt-2 text-xs text-amber-400">
                  {nameCooldown}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <AtSign className="h-4 w-4 text-[#45A29E]" />

                <label className="text-sm font-semibold text-slate-200">
                  Username
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-[#0B0C10]/70 px-4 transition-all duration-300 focus-within:border-[#45A29E]/60 focus-within:ring-2 focus-within:ring-[#45A29E]/10">
                  <span className="text-[#45A29E]">@</span>

                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase())
                    }
                    disabled={!!cooldown || savingUsername}
                    className="w-full min-w-0 bg-transparent py-3 pl-2 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="username"
                  />
                </div>

                <button
                  onClick={handleSaveUsername}
                  disabled={
                    !!cooldown ||
                    savingUsername ||
                    username === user?.username
                  }
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#45A29E] px-5 text-sm font-semibold text-[#0B0C10] transition-all duration-300 hover:bg-[#66c8c2] hover:shadow-[0_0_25px_rgba(69,162,158,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {savingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>

              {usernameError && (
                <p className="mt-2 text-xs text-[#F64C72]">
                  {usernameError}
                </p>
              )}

              {cooldown && (
                <p className="mt-2 text-xs text-amber-400">
                  {cooldown}
                </p>
              )}

              {!cooldown && !usernameError && (
                <p className="mt-2 text-[11px] text-slate-600">
                  3–20 characters · lowercase letters, numbers and
                  underscores
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#45A29E]" />

                  <label className="text-sm font-semibold text-slate-200">
                    Bio
                  </label>
                </div>

                <span
                  className={`text-xs ${
                    bio.length >= BIO_LIMIT
                      ? 'text-[#F64C72]'
                      : 'text-slate-600'
                  }`}
                >
                  {bio.length}/{BIO_LIMIT}
                </span>
              </div>

              <textarea
                value={bio}
                maxLength={BIO_LIMIT}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a little about yourself..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0C10]/70 px-4 py-3 text-sm leading-6 text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-[#45A29E]/60 focus:bg-[#0B0C10] focus:ring-2 focus:ring-[#45A29E]/10"
              />

              <button
                onClick={handleSaveBio}
                disabled={savingBio || bio === user?.bio}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#45A29E] to-[#3b8f8b] px-5 py-2.5 text-sm font-semibold text-[#0B0C10] shadow-lg shadow-[#45A29E]/5 transition-all duration-300 hover:shadow-[0_0_25px_rgba(69,162,158,0.18)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {savingBio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save bio
                  </>
                )}
              </button>
            </div>

            {/* Security / account zone */}
            <div className="rounded-2xl border border-[#F64C72]/10 bg-[#F64C72]/[0.025] p-4 sm:p-5">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F64C72]/10 text-[#F64C72]">
                  <ShieldAlert className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Danger zone
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Deleting your account permanently removes your AURA
                    account and cannot be undone.
                  </p>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#F64C72] transition-all duration-300 hover:text-[#ff718d]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] uppercase tracking-[0.25em] text-slate-700">
          <span className="h-px w-8 bg-slate-800" />
          AURA SETTINGS
          <span className="h-px w-8 bg-slate-800" />
        </div>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}