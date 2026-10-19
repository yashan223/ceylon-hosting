"use client";

import { useEffect, useState } from "react";
import { Server, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";

export type ServerConfig = {
  serverName: string;
  serverPassword: string;
  rconPassword: string;
};

type ServerConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (config: ServerConfig) => void;
};

function ServerConfigDialog({
  onClose,
  product,
  onConfirm,
}: {
  onClose: () => void;
  product: Product;
  onConfirm: (config: ServerConfig) => void;
}) {
  const [serverName, setServerName] = useState("");
  const [serverPassword, setServerPassword] = useState("");
  const [rconPassword, setRconPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = serverName.trim();
    const cleanPass = serverPassword.trim();
    const cleanRcon = rconPassword.trim();

    if (!cleanName) {
      setError("Please enter a server name.");
      return;
    }
    if (!cleanPass) {
      setError("Please enter a server password.");
      return;
    }
    if (!cleanRcon) {
      setError("Please enter an RCON password for server management.");
      return;
    }

    onConfirm({
      serverName: cleanName,
      serverPassword: cleanPass,
      rconPassword: cleanRcon,
    });
  }

  return (
    <div className="server-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="server-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="server-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onClose}
          aria-label="Close server configuration"
        >
          <X size={18} />
        </button>

        <div className="server-modal-header">
          <div className="server-modal-icon">
            <Server size={22} />
          </div>
          <div>
            <h3 id="server-modal-title">Configure Server</h3>
            <p>Enter the details for {product.name} to continue.</p>
          </div>
        </div>

        <form className="server-modal-form" onSubmit={handleSubmit}>
          {error && <div className="server-modal-error">{error}</div>}

          <div className="server-modal-field">
            <label className="server-modal-label" htmlFor="server-config-name">
              Server Name <span className="server-modal-req">*</span>
            </label>
            <input
              id="server-config-name"
              className="server-modal-input"
              value={serverName}
              onChange={(e) => {
                setServerName(e.target.value);
                if (error) setError("");
              }}
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <div className="server-modal-field">
            <label className="server-modal-label" htmlFor="server-config-pass">
              Server Password <span className="server-modal-req">*</span>
            </label>
            <input
              id="server-config-pass"
              className="server-modal-input"
              value={serverPassword}
              onChange={(e) => {
                setServerPassword(e.target.value);
                if (error) setError("");
              }}
              maxLength={50}
              required
            />
          </div>

          <div className="server-modal-field">
            <label className="server-modal-label" htmlFor="server-config-rcon">
              RCON Password <span className="server-modal-req">*</span>
            </label>
            <input
              id="server-config-rcon"
              className="server-modal-input"
              value={rconPassword}
              onChange={(e) => {
                setRconPassword(e.target.value);
                if (error) setError("");
              }}
              maxLength={50}
              required
            />
          </div>

          <div className="server-modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add to cart
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ServerConfigModal({
  isOpen,
  onClose,
  product,
  onConfirm,
}: ServerConfigModalProps) {
  if (!isOpen || !product) return null;

  return (
    <ServerConfigDialog
      key={product.id}
      onClose={onClose}
      product={product}
      onConfirm={onConfirm}
    />
  );
}
