// src/pages/SearchUsers.jsx

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Search,
  X,
  Loader2,
  UserSearch,
  Sparkles,
  ArrowRight,
  Users,
} from 'lucide-react';
import { searchUsers } from '../api/userApi';
import { useDebounce } from '../hooks/useDebounce';
import UserResultCard from '../components/UserResultCard';

const LIMIT = 20;

export default function SearchUsers() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('idle');
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    latestQueryRef.current = trimmed;

    if (!trimmed) {
      setStatus('idle');
      setResults([]);
      setPage(1);
      setTotalPages(1);
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');

    searchUsers(trimmed, 1, LIMIT, controller.signal)
      .then(({ data }) => {
        if (latestQueryRef.current !== trimmed) return;

        setResults(data.users);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setStatus('loaded');
      })
      .catch((err) => {
        if (
          err.name === 'CanceledError' ||
          err.code === 'ERR_CANCELED'
        ) {
          return;
        }

        if (latestQueryRef.current !== trimmed) return;

        setStatus('error');

        toast.error(
          err.response?.data?.message ||
            'Search failed. Please try again.'
        );
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const handleLoadMore = async () => {
    const trimmed = query.trim();

    if (
      !trimmed ||
      loadingMore ||
      page >= totalPages
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const { data } = await searchUsers(
        trimmed,
        page + 1,
        LIMIT
      );

      setResults((prev) => [...prev, ...data.users]);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Could not load more results'
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setStatus('idle');
  };

  const handleOpenProfile = (targetUser) => {
    navigate(`/dashboard/users/${targetUser.id}`);
  };

  return (
    <div className="relative h-full overflow-y-auto bg-[#0B0C10] text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Aqua glow */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#45A29E]/10 blur-3xl" />

        {/* Pink glow */}
        <div className="absolute right-[-150px] top-1/3 h-96 w-96 rounded-full bg-[#F64C72]/8 blur-3xl" />

        {/* Bottom glow */}
        <div className="absolute bottom-[-180px] left-1/3 h-96 w-96 rounded-full bg-[#45A29E]/5 blur-3xl" />

        {/* Cyber grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#45A29E 1px, transparent 1px), linear-gradient(90deg, #45A29E 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Header */}
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#45A29E]/20 bg-[#45A29E]/10">
              <Sparkles className="h-4 w-4 text-[#45A29E]" />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#45A29E]">
              AURA Discovery
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Find people.
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Search the AURA network by name or username and
            connect instantly.
          </p>
        </div>

        {/* Main search panel */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1F2833]/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {/* Neon top line */}
          <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#45A29E] to-transparent" />

          {/* Panel glow */}
          <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-[#45A29E]/10 blur-3xl" />

          <div className="relative p-4 sm:p-6">
            {/* Search label */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#45A29E]" />

                <span className="text-sm font-semibold text-slate-200">
                  Search users
                </span>
              </div>

              {results.length > 0 && (
                <span className="rounded-full border border-[#45A29E]/15 bg-[#45A29E]/5 px-2.5 py-1 text-[10px] font-medium text-[#45A29E]">
                  {results.length}
                  {totalPages > 1 ? '+' : ''} found
                </span>
              )}
            </div>

            {/* Search box */}
            <div className="group relative">
              {/* Search glow */}
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-[#45A29E]/0 via-[#45A29E]/0 to-[#F64C72]/0 opacity-0 blur-sm transition duration-500 group-focus-within:from-[#45A29E]/20 group-focus-within:via-[#45A29E]/10 group-focus-within:to-[#F64C72]/10 group-focus-within:opacity-100" />

              <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#0B0C10]/75 transition-all duration-300 group-focus-within:border-[#45A29E]/50 group-focus-within:bg-[#0B0C10] group-focus-within:shadow-[0_0_30px_rgba(69,162,158,0.08)]">
                <Search className="ml-4 h-5 w-5 shrink-0 text-slate-500 transition-colors duration-300 group-focus-within:text-[#45A29E]" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or username..."
                  autoFocus
                  className="w-full min-w-0 bg-transparent px-3 py-4 text-sm text-white outline-none placeholder:text-slate-600"
                />

                {/* Loading indicator */}
                {status === 'loading' && (
                  <Loader2 className="mr-3 h-4 w-4 shrink-0 animate-spin text-[#45A29E]" />
                )}

                {/* Clear */}
                {query && status !== 'loading' && (
                  <button
                    onClick={handleClear}
                    type="button"
                    aria-label="Clear search"
                    className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search hint */}
            {status === 'idle' && !query && (
              <div className="mt-3 flex items-center gap-2 px-1 text-[11px] text-slate-600">
                <span className="h-1 w-1 rounded-full bg-[#45A29E]" />
                Start typing to search the AURA network
              </div>
            )}

            {/* Results area */}
            <div className="mt-6">
              {/* Idle */}
              {status === 'idle' && (
                <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/5 bg-[#0B0C10]/35 px-5 py-14 text-center">
                  <div className="absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#45A29E]/50 to-transparent" />

                  <div className="relative mb-5">
                    <div className="absolute -inset-4 rounded-full bg-[#45A29E]/10 blur-xl" />

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#45A29E]/20 bg-[#45A29E]/5">
                      <UserSearch className="h-7 w-7 text-[#45A29E]" />
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-200">
                    Discover your next conversation
                  </p>

                  <p className="mt-1.5 max-w-xs text-xs leading-5 text-slate-600">
                    Find people on AURA by searching their name
                    or username.
                  </p>
                </div>
              )}

              {/* Loading */}
              {status === 'loading' && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0B0C10]/35 py-14">
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-full bg-[#45A29E]/10 blur-lg" />

                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#45A29E]/20 bg-[#45A29E]/5">
                      <Loader2 className="h-5 w-5 animate-spin text-[#45A29E]" />
                    </div>
                  </div>

                  <p className="mt-4 text-xs font-medium text-slate-500">
                    Searching the network...
                  </p>
                </div>
              )}

              {/* No results */}
              {status === 'loaded' &&
                results.length === 0 && (
                  <div className="flex flex-col items-center rounded-2xl border border-white/5 bg-[#0B0C10]/35 px-5 py-14 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F64C72]/15 bg-[#F64C72]/5">
                      <Search className="h-6 w-6 text-[#F64C72]/70" />
                    </div>

                    <p className="text-sm font-semibold text-slate-200">
                      No users found
                    </p>

                    <p className="mt-1.5 max-w-xs text-xs leading-5 text-slate-600">
                      We couldn't find anyone matching{' '}
                      <span className="text-slate-400">
                        "{query.trim()}"
                      </span>
                      .
                    </p>

                    <button
                      onClick={handleClear}
                      className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-400 transition-all duration-300 hover:border-[#45A29E]/30 hover:bg-[#45A29E]/5 hover:text-[#45A29E]"
                    >
                      Try another search
                    </button>
                  </div>
                )}

              {/* Error */}
              {status === 'error' && (
                <div className="rounded-2xl border border-[#F64C72]/15 bg-[#F64C72]/[0.03] px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    Something went wrong
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Please try your search again.
                  </p>

                  <button
                    onClick={() => setQuery(query)}
                    className="mt-4 rounded-xl border border-[#F64C72]/20 bg-[#F64C72]/5 px-4 py-2 text-xs font-medium text-[#F64C72] transition-all duration-300 hover:bg-[#F64C72]/10"
                  >
                    Retry search
                  </button>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      People
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#45A29E] shadow-[0_0_8px_rgba(69,162,158,0.8)]" />
                      <span className="text-[10px] text-slate-600">
                        Live results
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {results.map((u, index) => (
                      <button
                        key={u.id}
                        onClick={() => handleOpenProfile(u)}
                        className="group w-full text-left"
                        style={{
                          animation: `auraSearchIn 0.35s ease-out ${
                            Math.min(index, 8) * 45
                          }ms both`,
                        }}
                      >
                        <div className="relative rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-[#45A29E]/0 via-[#45A29E]/0 to-[#F64C72]/0 opacity-0 transition duration-300 group-hover:from-[#45A29E]/10 group-hover:via-[#45A29E]/5 group-hover:to-[#F64C72]/10 group-hover:opacity-100" />

                          <div className="relative">
                            <UserResultCard user={u} />

                            <ArrowRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#45A29E] group-hover:opacity-100" />
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Load more */}
                    {page < totalPages && (
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="group mt-3 flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-medium text-slate-400 transition-all duration-300 hover:border-[#45A29E]/30 hover:bg-[#45A29E]/5 hover:text-[#45A29E] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load more
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] uppercase tracking-[0.25em] text-slate-700">
          <span className="h-px w-8 bg-slate-800" />
          AURA NETWORK
          <span className="h-px w-8 bg-slate-800" />
        </div>
      </div>

      {/* Result entrance animation */}
      <style>{`
        @keyframes auraSearchIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}