'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api/services';
import { getTokenRole } from '@/lib/auth/jwt';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { StellarLink } from '@/components/StellarLink';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { copyToClipboard, formatDate, cn } from '@/lib/utils';
import type { User, UserRole } from '@/types';

const PAGE_LIMIT = 20;

const USER_ROLES: UserRole[] = ['BUYER', 'SUPPLIER', 'LOGISTICS', 'ARBITER', 'ADMIN'];

const ROLE_BADGE_STYLES: Partial<Record<UserRole, string>> = {
  BUYER: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  SUPPLIER: 'bg-green-50 text-green-700 ring-green-600/20',
  LOGISTICS: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  ARBITER: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  ADMIN: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { address, user, token, isConnected } = useAuthStore();
  const currentRole = user?.role ?? getTokenRole(token);
  const isAdmin = currentRole === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isConnected && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isConnected, isAdmin, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setUsers(res.data ?? []);
      setTotalPages(res.totalPages ?? res.meta?.totalPages ?? 1);
      setTotalUsers(res.total ?? res.meta?.total ?? (res.data?.length ?? 0));
    } catch (err: unknown) {
      console.error('Failed to load users:', err);
      const msg =
        err instanceof Error ? err.message : 'Unable to load users. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, debouncedSearch, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.stellarAddress.toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleRoleChange = async (targetUser: User, nextRole: UserRole) => {
    if (nextRole === targetUser.role) return;
    setUpdatingId(targetUser.id);
    try {
      const updated = await adminApi.updateUserRole(targetUser.id, nextRole);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === targetUser.id ? { ...item, ...updated, role: updated.role ?? nextRole } : item,
        ),
      );
      setToast({
        type: 'success',
        message: `Updated ${targetUser.name || targetUser.stellarAddress.slice(0, 8)} to ${nextRole}.`,
      });
    } catch (err: unknown) {
      console.error('Failed to update user role:', err);
      const msg =
        err instanceof Error ? err.message : 'Could not update user role.';
      setToast({ type: 'error', message: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopy = async (userId: string, stellarAddress: string) => {
    await copyToClipboard(stellarAddress);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admin access required"
        description="You do not have permission to view this page."
        action={
          <Link href="/dashboard" className="btn-secondary inline-flex">
            Back to dashboard
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">User management</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
              Admin
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalUsers} {totalUsers === 1 ? 'registered account' : 'registered accounts'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Stellar address, name, email, or role..."
          aria-label="Search users"
          className="input pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="card p-4 border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchUsers()}
            className="btn-secondary text-xs py-1.5"
          >
            Retry
          </button>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="card p-8 flex items-center justify-center" role="status" aria-label="Loading users">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" aria-hidden="true" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={
            search.trim()
              ? 'No users match your search query.'
              : 'No registered users were returned by the server.'
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Stellar address</th>
                    <th className="px-4 py-3">Current role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Change role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredUsers.map((u) => {
                    const isSelf = u.stellarAddress === address;
                    const isUpdating = updatingId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {u.name || 'Unnamed user'}
                            </span>
                            {isSelf && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {u.email || 'No email'}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <StellarLink
                              value={u.stellarAddress}
                              type="account"
                              className="font-mono text-xs text-blue-600 hover:text-blue-800"
                            />
                            <button
                              type="button"
                              onClick={() => void handleCopy(u.id, u.stellarAddress)}
                              aria-label={`Copy address for ${u.name || u.stellarAddress}`}
                              className="text-gray-300 hover:text-gray-600 transition-colors"
                            >
                              {copiedId === u.id ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                              ROLE_BADGE_STYLES[u.role] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20',
                            )}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" aria-hidden="true" />
                            )}
                            <label htmlFor={`role-${u.id}`} className="sr-only">
                              Role for {u.name || u.stellarAddress}
                            </label>
                            <select
                              id={`role-${u.id}`}
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) =>
                                void handleRoleChange(u, e.target.value as UserRole)
                              }
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                            >
                              {USER_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
