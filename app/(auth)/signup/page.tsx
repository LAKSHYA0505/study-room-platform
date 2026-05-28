import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <AuthForm
      mode="signup"
      title="Create your account"
      description="Start building focused study sessions with your peers."
      submitLabel="Create account"
      alternateHref="/login"
      alternateText="Already have an account?"
      alternateLabel="Log in"
    />
  );
}
