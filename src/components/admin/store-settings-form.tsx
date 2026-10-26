"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Percent } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Button } from "@/components/ui/button";
import type { StoreSettings } from "@/server/settings/settings";

type StoreSettingsFormProps = {
  initialSettings: StoreSettings;
};

export function StoreSettingsForm({ initialSettings }: StoreSettingsFormProps) {
  const router = useRouter();
  const [taxEnabled, setTaxEnabled] = useState(initialSettings.taxEnabled);
  const [taxRate, setTaxRate] = useState(initialSettings.taxRate.toString());
  const [sandboxEnabled, setSandboxEnabled] = useState(initialSettings.sandboxEnabled !== false);
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialSettings.whatsappNumber || "+94 78 890 1407",
  );
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
          sandboxEnabled,
          whatsappNumber: whatsappNumber.trim(),
        }),
      });

      const data = (await res.json()) as { settings?: StoreSettings; error?: string };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? "Failed to save settings.");
      }

      setTaxEnabled(data.settings.taxEnabled);
      setTaxRate(data.settings.taxRate.toString());
      setSandboxEnabled(data.settings.sandboxEnabled !== false);
      setWhatsappNumber(data.settings.whatsappNumber || "+94 78 890 1407");
      setStatus({ message: "Store settings saved successfully." });
      router.refresh();
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
    <div className="admin-settings-page-wrap">
      <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">Store configuration</span>
            <h2>Payment & Tax Settings</h2>
          </div>
          <div className="admin-settings-header-actions">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="admin-settings-save-btn"
            >
              <Check size={16} />
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>

        {status && (
          <div className="admin-settings-toast-wrap">
            <div className={`admin-status-toast ${status.isError ? "error" : "success"}`}>
              <span>{status.message}</span>
              <button type="button" onClick={() => setStatus(null)}>
                ✕
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-settings-form">
          <div className="admin-settings-grid">
            <div className="admin-settings-main-card">
              <div className="admin-settings-group">
                {/* Sandbox / WhatsApp Mode Toggle */}
                <div className="admin-settings-row">
                  <div className="admin-settings-row-text">
                    <div className="admin-settings-title-row">
                      <strong>Payment Sandbox Mode</strong>
                      <span className={`admin-tax-status-pill ${sandboxEnabled ? "active" : ""}`}>
                        {sandboxEnabled ? "Active (Online Checkout)" : "Disabled (WhatsApp Orders)"}
                      </span>
                    </div>
                    <p>
                      When enabled, customer purchases flow through standard cart checkout and
                      Payments.lk gateway (login required). When disabled, customers order directly
                      via WhatsApp chat with no account or sign-in required.
                    </p>
                  </div>
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={sandboxEnabled}
                      onChange={(e) => setSandboxEnabled(e.target.checked)}
                    />
                    <span className="admin-switch-slider" />
                  </label>
                </div>

                {!sandboxEnabled && (
                  <div
                    className="admin-settings-field"
                    style={{
                      marginTop: "16px",
                      paddingBottom: "16px",
                      borderBottom: "1px dashed var(--border)",
                    }}
                  >
                    <label htmlFor="whatsappNumberInput" className="admin-settings-label">
                      WhatsApp Order Number
                    </label>
                    <div className="admin-input-with-adornment">
                      <input
                        id="whatsappNumberInput"
                        type="text"
                        className="admin-settings-input"
                        placeholder="+94 78 890 1407"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        required
                      />
                      <span className="admin-input-adornment">
                        <WhatsAppIcon size={16} />
                      </span>
                    </div>
                    <small className="admin-settings-hint">
                      Customer WhatsApp chat requests and product orders will be sent to this phone
                      number.
                    </small>
                  </div>
                )}

                {sandboxEnabled && (
                  <>
                    <div className="admin-settings-row" style={{ marginTop: "24px" }}>
                      <div className="admin-settings-row-text">
                        <div className="admin-settings-title-row">
                          <strong>Enable Payment Tax</strong>
                          <span className={`admin-tax-status-pill ${taxEnabled ? "active" : ""}`}>
                            {taxEnabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p>
                          When enabled, tax is automatically calculated and added to every customer
                          checkout and order payment.
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
                      <div className="admin-tax-presets">
                        <span className="admin-tax-presets-label">Quick presets:</span>
                        <button
                          type="button"
                          disabled={!taxEnabled}
                          onClick={() => setTaxRate("2.29")}
                          className={`admin-tax-preset-chip ${numRate === 2.29 ? "is-active" : ""}`}
                        >
                          2.29% (Default)
                        </button>
                        <button
                          type="button"
                          disabled={!taxEnabled}
                          onClick={() => setTaxRate("5.00")}
                          className={`admin-tax-preset-chip ${numRate === 5 ? "is-active" : ""}`}
                        >
                          5.00%
                        </button>
                        <button
                          type="button"
                          disabled={!taxEnabled}
                          onClick={() => setTaxRate("8.00")}
                          className={`admin-tax-preset-chip ${numRate === 8 ? "is-active" : ""}`}
                        >
                          8.00%
                        </button>
                        <button
                          type="button"
                          disabled={!taxEnabled}
                          onClick={() => setTaxRate("10.00")}
                          className={`admin-tax-preset-chip ${numRate === 10 ? "is-active" : ""}`}
                        >
                          10.00%
                        </button>
                      </div>
                      <small className="admin-settings-hint">
                        Default rate is 2.29%. This tax applies to all products and server
                        customizations in the cart.
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>

            <aside className="admin-settings-preview-card">
              <div className="admin-settings-preview-header">
                <div>
                  <span className="admin-kicker">Live preview</span>
                  <h3>Checkout simulation</h3>
                </div>
                <span className="admin-preview-badge">
                  {sandboxEnabled ? "Rs. 1,000 Order" : "WhatsApp Mode"}
                </span>
              </div>

              <div className="admin-settings-preview-table">
                <div className="admin-settings-preview-row">
                  <span>Store Mode:</span>
                  <strong>{sandboxEnabled ? "Online Gateway" : "WhatsApp Orders"}</strong>
                </div>
                {sandboxEnabled ? (
                  <>
                    <div className="admin-settings-preview-row">
                      <span>Sample Subtotal:</span>
                      <span>Rs. {sampleSubtotal.toLocaleString("en-LK")}.00</span>
                    </div>
                    <div className="admin-settings-preview-row">
                      <span>Tax ({taxEnabled ? `${numRate}%` : "Disabled"}):</span>
                      <span>
                        {taxEnabled
                          ? `+Rs. ${sampleTax.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "Rs. 0.00"}
                      </span>
                    </div>
                    <div className="admin-settings-preview-row total">
                      <span>Customer Pays:</span>
                      <strong>
                        Rs.{" "}
                        {sampleTotal.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="admin-settings-preview-row">
                      <span>Checkout:</span>
                      <span>Direct via WhatsApp</span>
                    </div>
                    <div className="admin-settings-preview-row">
                      <span>Customer Account:</span>
                      <span>Not Required</span>
                    </div>
                    <div className="admin-settings-preview-row total">
                      <span>Order Processing:</span>
                      <strong>Direct Chat</strong>
                    </div>
                  </>
                )}
              </div>

              <div className="admin-settings-preview-note">
                {sandboxEnabled
                  ? "Tax is automatically itemized on customer order receipts, checkout summaries, and payment requests."
                  : "In WhatsApp Orders mode, online checkout and cart tax are disabled. Customers order directly via WhatsApp chat."}
              </div>
            </aside>
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
