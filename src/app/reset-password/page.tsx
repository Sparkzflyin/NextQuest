import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-2 text-2xl font-semibold">Set a new password</h1>
      <p className="mb-6 text-sm text-neutral-400">
        You arrived here from a password reset link. Enter your new password below.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
