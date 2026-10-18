"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Package,
  User,
  ShoppingCart,
  Terminal,
  Clock,
  Server,
} from "lucide-react";
import type { AuditLogEntry, AuditAction } from "@/server/admin/audit";

type AuditLogViewerProps = {
  logs: AuditLogEntry[];
  isDashboardView?: boolean;
};

export function AuditLogViewer({ logs: initialLogs, isDashboardView = false }: AuditLogViewerProps) {
  const [logs] = useState<AuditLogEntry[]>(initialLogs);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterType !== "all" && log.targetType !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesActor = log.actorEmail?.toLowerCase().includes(query) ?? false;
        const matchesTarget = log.targetName?.toLowerCase().includes(query) ?? false;
        const matchesDetails = log.details?.toLowerCase().includes(query) ?? false;
        if (!matchesAction && !matchesActor && !matchesTarget && !matchesDetails) return false;
      }
      return true;
    });
  }, [logs, filterType, searchQuery]);

  function getActionBadge(action: AuditAction) {
    if (action.startsWith("PRODUCT_")) {
      const isDelete = action.includes("DELETE");
      return (
        <span className={`admin-audit-badge product ${isDelete ? "danger" : ""}`}>
          <Package size={11} /> {action.replace("PRODUCT_", "")}
        </span>
      );
    }
    if (action.startsWith("USER_")) {
      const isDelete = action.includes("DELETE");
      return (
        <span className={`admin-audit-badge user ${isDelete ? "danger" : ""}`}>
          <User size={11} /> {action.replace("USER_", "")}
        </span>
      );
    }
    if (action.startsWith("ORDER_")) {
      return (
        <span className="admin-audit-badge order">
          <ShoppingCart size={11} /> {action.replace("ORDER_", "")}
        </span>
      );
    }
    if (action.startsWith("SERVER_")) {
      return (
        <span className="admin-audit-badge order" style={{ background: "#eef2ff", color: "#4f46e5" }}>
          <Server size={11} /> {action.replace("SERVER_", "")}
        </span>
      );
    }
    return (
      <span className="admin-audit-badge system">
        <Terminal size={11} /> {action}
      </span>
    );
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-LK", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="admin-panel audit-panel">
      <div className="admin-panel-header">
        <div>
          <span className="admin-kicker">Security & changes</span>
          <h2>Audit log</h2>
        </div>
        <div className="product-panel-actions">
          <span className="admin-panel-meta">{logs.length} logged events</span>
          {isDashboardView && (
            <Link className="admin-store-link" href="/admin/audit">
              Full audit trail <span>↗</span>
            </Link>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All events
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterType === "product" ? "active" : ""}`}
            onClick={() => setFilterType("product")}
          >
            <Package size={12} /> Products
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterType === "user" ? "active" : ""}`}
            onClick={() => setFilterType("user")}
          >
            <User size={12} /> Users
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterType === "order" ? "active" : ""}`}
            onClick={() => setFilterType("order")}
          >
            <ShoppingCart size={12} /> Orders
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filterType === "system" ? "active" : ""}`}
            onClick={() => setFilterType("system")}
          >
            <Terminal size={12} /> System
          </button>
        </div>
        <div className="admin-catalog-search">
          <Search size={14} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Search action, actor, target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.slice(0, isDashboardView ? 8 : 40).map((log) => (
              <tr key={log.id}>
                <td data-label="Timestamp" style={{ whiteSpace: "nowrap" }}>
                  <span className="admin-audit-time">
                    <Clock size={11} style={{ marginRight: 4, opacity: 0.7 }} />
                    {formatTime(log.createdAt)}
                  </span>
                </td>
                <td data-label="Action">{getActionBadge(log.action)}</td>
                <td data-label="Actor">
                  <span className="admin-audit-actor">{log.actorEmail || "system"}</span>
                </td>
                <td data-label="Target">
                  <div className="admin-cell-main">
                    <strong>{log.targetName || log.targetId || "-"}</strong>
                    {log.targetId && log.targetName && (
                      <small className="admin-audit-target-id">{log.targetId}</small>
                    )}
                  </div>
                </td>
                <td data-label="Details">
                  <span className="admin-audit-details">{log.details || "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <p className="admin-empty">No audit events match your criteria.</p>
        )}
      </div>
    </section>
  );
}
