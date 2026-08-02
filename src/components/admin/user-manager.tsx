"use client";

import { useState, type FormEvent } from "react";
import { Mail, Plus, Power, UserRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

/** Account row shared by the server pages and this manager. */
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "ustadz" | "wali";
  /** better-auth `banned` flag drives the active/inactive state. */
  banned: boolean;
}

interface AccountForm {
  name: string;
  email: string;
  password: string;
}

const emptyForm: AccountForm = { name: "", email: "", password: "" };

/**
 * Ustadz / Wali account management (tasks 4.10–4.11). Admin creates accounts
 * via the admin API and toggles active/inactive by banning. Banning keeps the
 * row so historical `pencapaian` FKs stay intact.
 */
export default function UserManager({
  initialUsers,
  role,
  title,
  description,
}: {
  initialUsers: UserAccount[];
  role: "ustadz" | "wali";
  title: string;
  description: string;
}) {
  const toast = useToast();
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setUsers(await api<UserAccount[]>(`/api/users?role=${role}`));
  }

  function toggleForm() {
    setShowForm((v) => !v);
    setForm(emptyForm);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await toast.promise(
        api("/api/users", {
          method: "POST",
          body: JSON.stringify({ ...form, role }),
        }),
        {
          loading: "Membuat akun...",
          success: "Akun berhasil dibuat.",
          error: (err) => (err instanceof Error ? err.message : "Gagal membuat akun."),
        },
      );
      setForm(emptyForm);
      setShowForm(false);
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setLoading(false);
    }
  }

  /** Ban / unban an account (soft deactivate). */
  async function toggleBan(user: UserAccount) {
    try {
      await toast.promise(
        api(`/api/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: user.banned ? "unban" : "ban" }),
        }),
        {
          loading: user.banned ? "Mengaktifkan akun..." : "Menonaktifkan akun...",
          success: user.banned ? "Akun berhasil diaktifkan." : "Akun berhasil dinonaktifkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal mengubah status akun."),
        },
      );
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>
        <Button type="button" onClick={toggleForm}>
          <Plus className="h-4 w-4" aria-hidden />
          {showForm ? "Batal" : "Tambah Akun"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Buat Akun {title.replace("Kelola ", "")}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Nama" htmlFor="user-name">
              <Input
                id="user-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </Field>

            <Field label="Email" htmlFor="user-email">
              <Input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@email.com"
              />
            </Field>

            <Field
              label="Password"
              htmlFor="user-password"
              hint="Password minimal 8 karakter."
            >
              <Input
                id="user-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </Field>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Membuat..." : "Buat Akun"}
              </Button>
              <Button type="button" variant="secondary" onClick={toggleForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {users.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada akun. Gunakan tombol “Tambah Akun” untuk membuat.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {users.map((user) => (
            <Card key={user.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{user.name}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-ink-secondary">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {user.email}
                    </p>
                  </div>
                </div>
                <Badge variant={user.banned ? "secondary" : "success"}>
                  {user.banned ? "Nonaktif" : "Aktif"}
                </Badge>
              </div>

              <div className="flex">
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleBan(user)}>
                  <Power className="h-4 w-4" aria-hidden />
                  {user.banned ? "Aktifkan" : "Nonaktifkan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}