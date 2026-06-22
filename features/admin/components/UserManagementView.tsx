"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, ErrorState } from "@/components/ui/query-states";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
}

function RoleBadge({ role }: { role: string }): React.ReactElement {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isAdmin
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700",
      )}
    >
      {role}
    </span>
  );
}

function PlusIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function UserManagementView(): React.ReactElement {
  const msal = useMsalTokenContext();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("RECRUITER");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<UserRow[]>("/v1/users", { msal }),
  });

  const handleRoleChange = async (userId: string, newRole: string): Promise<void> => {
    setUpdatingId(userId);
    try {
      await apiFetch(`/v1/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
        msal,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      // Could add toast
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddUser = async (): Promise<void> => {
    if (!newName.trim() || !newEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await apiFetch("/v1/users", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
        msal,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowAddForm(false);
      setNewName("");
      setNewEmail("");
      setNewRole("RECRUITER");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add user.";
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-ink-muted">You do not have permission to access this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">User Management</h1>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <PlusIcon />
          Add User
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="mt-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <h3 className="mb-4 text-sm font-bold text-ink">Add New User</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active"
              >
                <option value="RECRUITER">Recruiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          {addError && (
            <p className="mt-3 text-xs text-red-600">{addError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddForm(false); setAddError(null); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={adding}
              onClick={() => void handleAddUser()}
            >
              {adding ? "Adding..." : "Add User"}
            </Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="mt-6 rounded-card border border-line bg-surface shadow-card">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-ink">
            Users ({users.length})
          </h2>
        </div>

        {isLoading && <div className="p-6"><LoadingSpinner /></div>}
        {error && <div className="p-6"><ErrorState message="Failed to load users." onRetry={() => void refetch()} /></div>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isUserAdmin = user.role === "ADMIN";
                  return (
                    <tr key={user.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-4 font-medium text-ink">{user.name}</td>
                      <td className="px-6 py-4 text-ink-muted">{user.email}</td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className="text-xs text-ink-subtle">Current user</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isUserAdmin ? "secondary" : "primary"}
                            disabled={updatingId === user.id}
                            onClick={() =>
                              void handleRoleChange(user.id, isUserAdmin ? "RECRUITER" : "ADMIN")
                            }
                          >
                            {updatingId === user.id ? "..." : isUserAdmin ? "Revoke Admin" : "Make Admin"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-ink-muted">
                      No users found. Click "Add User" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
