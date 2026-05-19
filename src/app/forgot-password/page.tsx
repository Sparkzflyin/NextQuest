import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-2 text-2xl font-semibold">Forgot your password?</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>
      <ForgotPasswordForm emailPromise={searchParams} />
    </div>
  );
}
