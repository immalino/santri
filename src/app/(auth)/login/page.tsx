import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { roleHome, type Role } from "@/lib/roles";
import LoginForm from "./login-form";

export const metadata = {
  title: "Masuk | e-Santri",
};

export default async function LoginPage() {
  // Already signed in → send the user straight to their home page.
  const session = await getCurrentUser();
  if (session) {
    redirect(roleHome[session.user.role as Role]);
  }
  return <LoginForm />;
}
