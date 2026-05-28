import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Log In | Study Room Platform"
};

export default function LoginPage() {
  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      description="Log in to continue to your study rooms."
      submitLabel="Log in"
      alternateHref="/signup"
      alternateText="Need an account?"
      alternateLabel="Sign up"
    />
  );
}
