"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/ui/country-select";
import { getCountryDialCode, formatPhoneWithCountryCode } from "@/lib/countries";

type ProfileFormProps = {
  user: { email: string; firstName?: string; country?: string; whatsapp?: string };
};

export function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const [user, setUser] = useState(initialUser);
  const [country, setCountry] = useState(initialUser.country ?? "");
  const [whatsapp, setWhatsapp] = useState(initialUser.whatsapp ?? "");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const dialCode = getCountryDialCode(country);

  function handleCountryChange(newCountry: string) {
    setCountry(newCountry);
    const newDial = getCountryDialCode(newCountry);
    if (newDial) {
      setWhatsapp((prev) => formatPhoneWithCountryCode(prev, newDial));
    }
  }

  function handleWhatsappFocus() {
    if (!whatsapp.trim() && dialCode) {
      setWhatsapp(`${dialCode} `);
    }
  }

  function handleWhatsappBlur() {
    if (whatsapp.trim() && dialCode) {
      setWhatsapp((prev) => formatPhoneWithCountryCode(prev, dialCode));
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    const formData = new FormData(event.currentTarget);
    const effectiveWhatsapp = dialCode
      ? formatPhoneWithCountryCode(whatsapp, dialCode).trim()
      : whatsapp.trim();
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        country,
        whatsapp: effectiveWhatsapp,
      }),
    });
    const result = (await response.json()) as { user?: ProfileFormProps["user"]; error?: string };
    if (response.ok && result.user) {
      setUser(result.user);
      setCountry(result.user.country ?? "");
      setWhatsapp(result.user.whatsapp ?? "");
      setStatus("Profile updated.");
    } else {
      setStatus(result.error ?? "Unable to update profile.");
    }
    setIsSaving(false);
  }

  return (
    <form className="profile-form" onSubmit={saveProfile}>
      <label>
        Full name
        <Input name="firstName" defaultValue={user.firstName ?? ""} autoComplete="name" />
      </label>
      <label>
        Email address
        <Input value={user.email} readOnly />
      </label>
      <div className="profile-field-group">
        <span>Country</span>
        <CountrySelect name="country" value={country} onChange={handleCountryChange} />
      </div>
      <label>
        WhatsApp number
        <Input
          name="whatsapp"
          type="tel"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          onFocus={handleWhatsappFocus}
          onBlur={handleWhatsappBlur}
          autoComplete="tel"
        />
      </label>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save profile"}
      </Button>
      {status && <p className="profile-form-status">{status}</p>}
    </form>
  );
}
