"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/lib/validations";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Field } from "@/components/ui/field";

/** Maps better-auth change-password error codes to Bahasa Indonesia messages. */
const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  INVALID_PASSWORD: "Password saat ini salah.",
  PASSWORD_TOO_SHORT: "Password baru minimal 8 karakter.",
  PASSWORD_TOO_LONG: "Password baru terlalu panjang.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Akun tidak ditemukan.",
};

/** Resolve a friendly message for an error object, falling back to its text. */
function passwordErrorMessage(error: { code?: string; message?: string }) {
  if (error.code && PASSWORD_ERROR_MESSAGES[error.code]) {
    return PASSWORD_ERROR_MESSAGES[error.code];
  }
  return error.message ?? "Gagal mengganti password.";
}

/**
 * Self-service password change (feature "Ganti Password Akun"). Lets any
 * logged-in user change their own password: verify current password, set a
 * new one, and revoke all other active sessions (the current device stays
 * logged in via the fresh session better-auth creates).
 */
export default function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "Periksa kembali input Anda.");
      return;
    }

    setLoading(true);
    try {
      await toast.promise(
        async () => {
          const { error } = await authClient.changePassword({
            currentPassword: parsed.data.currentPassword,
            newPassword: parsed.data.newPassword,
            revokeOtherSessions: true,
          });
          if (error) throw new Error(passwordErrorMessage(error));
        },
        {
          loading: "Mengganti password...",
          success: "Password berhasil diganti.",
          error: (err) =>
            err instanceof Error ? err.message : "Gagal mengganti password.",
        },
      );
      // Clear fields on success so the form is ready for the next change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // Error already surfaced through the toast.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <Field label="Password saat ini" htmlFor="current-password">
        <PasswordInput
          id="current-password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <Field
        label="Password baru"
        htmlFor="new-password"
        hint="Minimal 8 karakter. Sesi aktif di perangkat lain akan dicabut."
      >
        <PasswordInput
          id="new-password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <Field label="Konfirmasi password baru" htmlFor="confirm-password">
        <PasswordInput
          id="confirm-password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Mengganti..." : "Ganti Password"}
      </Button>
    </form>
  );
}
