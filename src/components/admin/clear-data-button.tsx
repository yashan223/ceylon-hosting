"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

type ClearDataButtonProps = {
  variant?: "header" | "danger-panel";
  label?: string;
};

export function ClearDataButton({
  variant = "header",
  label,
}: ClearDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    setIsClearing(true);
    try {
      const response = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to clear store data.");
      }

      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear store data.";
      window.alert(message);
    } finally {
      setIsClearing(false);
    }
  }

  const defaultLabel =
    variant === "danger-panel" ? "Clear all store data" : "Clear all data";
  const buttonClass =
    variant === "danger-panel"
      ? "admin-clear-data-btn"
      : "admin-clear-data-btn admin-clear-data-btn-header";

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => setIsOpen(true)}
        disabled={isClearing}
      >
        <Trash2 size={14} />
        <span>{label ?? defaultLabel}</span>
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => !isClearing && setIsOpen(false)}
        onConfirm={handleClear}
        title="Clear all store data?"
        description={
          <div className="admin-clear-modal-body">
            <p>
              Are you sure you want to permanently clear <strong>all store data</strong>?
            </p>
            <div className="admin-clear-modal-box">
              <strong>The following data will be permanently wiped:</strong>
              <ul>
                <li>All product catalog items (servers, mods, services)</li>
                <li>All uploaded product files and digital storage</li>
                <li>All customer orders, events, and support messages</li>
                <li>All server subscriptions and notifications</li>
                <li>All customer accounts and active customer sessions</li>
                <li>All historical audit logs</li>
              </ul>
            </div>
            <p className="admin-clear-modal-safe">
              🔒 <strong>Preserved:</strong> Your administrator account and active login credentials will remain intact.
            </p>
          </div>
        }
        confirmText="Yes, clear all data"
        cancelText="Cancel"
        variant="danger"
        isLoading={isClearing}
      />
    </>
  );
}
