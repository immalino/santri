import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireApiRole } from "@/lib/permissions";
import { setUserStatusSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Activate / deactivate an account. Banning revokes the user's sessions and
 * prevents sign-in; the row stays so historical `pencapaian` FKs stay intact.
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = setUserStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "ban") {
      await auth.api.banUser({ body: { userId: id }, headers: await headers() });
    } else {
      await auth.api.unbanUser({ body: { userId: id }, headers: await headers() });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah status akun." }, { status: 400 });
  }
}
