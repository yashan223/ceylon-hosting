"use client";

import { Trash2, Search, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export type AdminUserView = {
  id: string;
  email: string;
  firstName?: string;
  country?: string;
  whatsapp?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserManagementProps = {
  users: AdminUserView[];
  isDashboardView?: boolean;
};

export function UserManagement({
  users: initialUsers,
  isDashboardView = false,
}: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerification, setFilterVerification] = useState<"all" | "verified" | "pending">(
    "all",
  );
  const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);

  async function confirmDeleteUser() {
    if (!userToDelete) return;
    setPendingId(userToDelete.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete.id }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to delete user.");
      }
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== userToDelete.id),
      );
      setUserToDelete(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete user.");
    } finally {
      setPendingId(null);
    }
  }

  const counts = useMemo(() => {
    return {
      all: users.length,
      verified: users.filter((u) => u.emailVerified).length,
      pending: users.filter((u) => !u.emailVerified).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filterVerification === "verified" && !user.emailVerified) return false;
      if (filterVerification === "pending" && user.emailVerified) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesEmail = user.email.toLowerCase().includes(query);
        const matchesName = user.firstName?.toLowerCase().includes(query) ?? false;
        const matchesCountry = user.country?.toLowerCase().includes(query) ?? false;
        const matchesWhatsapp = user.whatsapp?.toLowerCase().includes(query) ?? false;
        if (!matchesEmail && !matchesName && !matchesCountry && !matchesWhatsapp) return false;
      }
      return true;
    });
  }, [users, filterVerification, searchQuery]);

  return (
    <section className="admin-panel user-management-panel">
      <div className="admin-panel-header">
        <div>
          <span className="admin-kicker">Accounts & access</span>
          <h2>User management</h2>
        </div>
        <div className="product-panel-actions">
          <span className="admin-panel-meta">{users.length} registered accounts</span>
          {isDashboardView && (
            <Link className="admin-store-link" href="/admin/users">
              Full user list <span>↗</span>
            </Link>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${filterVerification === "all" ? "active" : ""}`}
            onClick={() => setFilterVerification("all")}
          >
            All users <span>({counts.all})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterVerification === "verified" ? "active" : ""}`}
            onClick={() => setFilterVerification("verified")}
          >
            <UserCheck size={12} /> Verified <span>({counts.verified})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterVerification === "pending" ? "active" : ""}`}
            onClick={() => setFilterVerification("pending")}
          >
            <UserX size={12} /> Pending <span>({counts.pending})</span>
          </button>
        </div>
        <div className="admin-catalog-search">
          <Search size={14} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Search email, name, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Country</th>
              <th>Verification</th>
              <th>Registered</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.slice(0, isDashboardView ? 8 : 50).map((user) => (
              <tr key={user.id}>
                <td data-label="Customer">
                  <div className="admin-cell-main">
                    <strong>{user.firstName || "Customer"}</strong>
                    <small>{user.email}</small>
                    {user.whatsapp && (
                      <small className="admin-user-whatsapp" style={{ color: "#2563eb", marginTop: 2 }}>
                        WhatsApp: {user.whatsapp}
                      </small>
                    )}
                  </div>
                </td>
                <td data-label="Country">{user.country || "LK"}</td>
                <td data-label="Verification">
                  <span className={user.emailVerified ? "admin-status active" : "admin-status"}>
                    {user.emailVerified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td data-label="Registered">
                  {new Date(user.createdAt).toLocaleDateString("en-LK")}
                </td>
                <td data-label="Actions" className="admin-table-action">
                  <button
                    className="admin-action-button"
                    type="button"
                    onClick={() => setUserToDelete(user)}
                    disabled={pendingId === user.id}
                    aria-label={`Delete ${user.email}`}
                    title="Delete user"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p className="admin-empty">No registered customer accounts found.</p>
        )}
      </div>

      <ConfirmationModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="Delete User"
        description={
          userToDelete ? (
            <span>
              Are you sure you want to delete <strong>{userToDelete.email}</strong>? This action
              cannot be undone and signs the user out of every device.
            </span>
          ) : null
        }
        confirmText="Delete user"
        variant="danger"
        isLoading={Boolean(pendingId)}
        onConfirm={confirmDeleteUser}
      />
    </section>
  );
}
