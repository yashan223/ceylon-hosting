"use client";

import { useState } from "react";
import { Check, Percent, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreSettings } from "@/server/settings/settings";

type StoreSettingsFormProps = {
  initialSettings: StoreSettings;
};

export function StoreSettingsForm({ initialSettings }: StoreSettingsFormProps) {
  const [taxEnabled, setTaxEnabled] = useState(initialSettings.taxEnabled);
  const [taxRate, setTaxRate] = useState(initialSettings.taxRate.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError?: boolean } | null>(null);

  const numRate = parseFloat(taxRate) || 0;
  const sampleSubtotal = 1000;
  const sampleTax = taxEnabled ? Math.round(sampleSubtotal * (numRate / 100) * 100) / 100 : 0;
  const sampleTotal = sampleSubtotal + sampleTax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxEnabled,
          taxRate: numRate,
        }),
      });

      const data = (await res.json()) as { settings?: StoreSettings; error?: string };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? "Failed to save settings.");
      }

      setTaxEnabled(data.settings.taxEnabled);
      setTaxRate(data.settings.taxRate.toString());
      setStatus({ message: "Store tax settings saved successfully." });
    } catch (err) {
      setStatus({
        message: err instanceof Error ? err.message : "Failed to update settings.",
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-settings-container">
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">Store configuration</span>
            <h2>Payment & Tax Settings</h2>
          </div>
          <Settings2 size={20} className="text-muted-foreground" />
        </div>

        {status && (
          <div
            className={`admin-status-toast ${status.isError ? "error" : "success"}`}
            style={{ marginBottom: 20 }}
          >
            <span>{status.message}</span>
            <button type="button" onClick={() => setStatus(null)}>
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-settings-form">
          <div className="admin-settings-section">
            <div className="admin-settings-row">
              <div className="admin-settings-row-text">
                <strong>Enable Payment Tax</strong>
                <p>
                  When enabled, tax is automatically calculated and added to every customer checkout
                  and order payment.
                </p>
              </div>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                />
                <span className="admin-switch-slider" />
              </label>
            </div>

            <div className="admin-settings-field">
              <label htmlFor="taxRateInput" className="admin-settings-label">
                Tax Rate (%)
              </label>
              <div className="admin-input-with-adornment">
                <input
                  id="taxRateInput"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="admin-settings-input"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  disabled={!taxEnabled}
                  required
                />
                <span className="admin-input-adornment">
                  <Percent size={14} />
                </span>
              </div>
              <small className="admin-settings-hint">
                Default rate is 2.29%. This tax applies to all products and server customizations in the cart.
              </small>
            </div>

            <div className="admin-settings-preview">
              <span className="admin-kicker">Checkout calculation preview</span>
              <div className="admin-settings-preview-table">
                <div className="admin-settings-preview-row">
                  <span>Sample Subtotal:</span>
                  <span>Rs. {sampleSubtotal.toLocaleString("en-LK")}.00</span>
                </div>
                <div className="admin-settings-preview-row">
                  <span>Tax ({taxEnabled ? `${numRate}%` : "Disabled"}):</span>
                  <span>
                    {taxEnabled ? `+Rs. ${sampleTax.toFixed(2)}` : "Rs. 0.00"}
                  </span>
                </div>
                <div className="admin-settings-preview-row total">
                  <span>Customer Pays:</span>
                  <strong>Rs. {sampleTotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-settings-actions">
            <Button type="submit" disabled={isSaving}>
              <Check size={16} />
              {isSaving ? "Saving changes..." : "Save settings"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
