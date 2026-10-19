"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/ui/country-select";

type ProfileFormProps = { user: { email: string; firstName?: string; country?: string } };

export function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const [user, setUser] = useState(initialUser);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        country: formData.get("country"),
      }),
    });
    const result = (await response.json()) as { user?: ProfileFormProps["user"]; error?: string };
    if (response.ok && result.user) {
      setUser(result.user);
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
        <CountrySelect name="country" defaultValue={user.country ?? ""} />
      </div>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save profile"}
      </Button>
      {status && <p className="profile-form-status">{status}</p>}
    </form>
  );
}
