"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Clock, RefreshCw, Send } from "lucide-react";
import type { ServerSubscriptionWithTiming } from "@/server/subscriptions/servers";

export function ServerSubscriptionManager({
  subscriptions: initialSubscriptions,
}: {
  subscriptions: ServerSubscriptionWithTiming[];
}) {
  const [subscriptions] = useState(initialSubscriptions);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  async function handleRunCheck() {
    setIsRunningCheck(true);
    setCheckResult(null);

    try {
      const response = await fetch("/api/cron/server-reminders", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to trigger reminder checks.");
      }

      setCheckResult(
        `Scanned ${data.totalChecked} servers: ${data.remindersSent} Day 25 reminder email(s) sent, ${data.expiredMarked} marked expired.`,
      );

      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err) {
      setCheckResult(err instanceof Error ? err.message : "Error running reminder checks.");
    } finally {
      setIsRunningCheck(false);
    }
  }

  return (
    <section className="admin-panel user-management-panel">
      <div className="admin-panel-header">
        <div>
          <span className="admin-kicker">Recurring Billing</span>
          <h2>Monthly Server Subscriptions</h2>
        </div>
        <div className="product-panel-actions">
          <span className="admin-panel-meta">{subscriptions.length} active server plans</span>
          <button
            type="button"
            className="ui-button ui-button-sm ui-button-default"
            onClick={handleRunCheck}
            disabled={isRunningCheck}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {isRunningCheck ? <RefreshCw size={13} className="spin-icon" /> : <Send size={13} />}
            {isRunningCheck ? "Running checks..." : "Check & Send Day 25 Reminders"}
          </button>
        </div>
      </div>

      {checkResult && (
        <div
          style={{
            margin: "14px 24px 0",
            padding: "10px 16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            fontSize: 12,
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Bell size={14} />
          <span>{checkResult}</span>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Server</th>
              <th>Customer</th>
              <th>Cycle Period</th>
              <th>Days Remaining</th>
              <th>Status</th>
              <th>Day 25 Reminder</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => {
              const reminderSentDate = sub.reminderSentAt
                ? new Date(sub.reminderSentAt).toLocaleDateString("en-LK", {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <tr key={sub.id}>
                  <td data-label="Server">
                    <div className="admin-cell-main">
                      <strong>{sub.serverName}</strong>
                      <small>{sub.id}</small>
                    </div>
                  </td>
                  <td data-label="Customer">{sub.userEmail}</td>
                  <td data-label="Cycle Period">
                    <div className="admin-cell-main">
                      <span>Expires {sub.formattedExpiry}</span>
                      <small>{sub.formattedRenewalPrice} / mo</small>
                    </div>
                  </td>
                  <td data-label="Days Remaining">
                    <strong>Day {Math.min(30, sub.daysElapsed)}</strong> of 30 ({sub.daysRemaining}{" "}
                    days left)
                  </td>
                  <td data-label="Status">
                    {sub.isExpired ? (
                      <span
                        className="admin-status"
                        style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}
                      >
                        Expired
                      </span>
                    ) : sub.isDay25OrLater ? (
                      <span
                        className="admin-status"
                        style={{ background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" }}
                      >
                        Renewal Due (Day {sub.daysElapsed})
                      </span>
                    ) : (
                      <span className="admin-status active">Active</span>
                    )}
                  </td>
                  <td data-label="Day 25 Reminder">
                    {reminderSentDate ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#16a34a",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={13} /> Sent on {reminderSentDate}
                      </span>
                    ) : sub.isDay25OrLater && !sub.isExpired ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#d97706",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <Clock size={13} /> Due now (Send check)
                      </span>
                    ) : (
                      <span style={{ color: "#737373", fontSize: 11 }}>Scheduled on Day 25</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {subscriptions.length === 0 && (
          <p className="admin-empty">No active monthly server subscriptions found.</p>
        )}
      </div>
    </section>
  );
}
