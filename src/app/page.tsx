import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { roleHome, type Role } from "@/lib/roles";

export default async function HomePage() {
  const session = await getCurrentUser();
  redirect(session ? roleHome[session.user.role as Role] : "/login");
}
