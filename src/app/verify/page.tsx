import { VerifyPanel } from "./verify-panel";

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-2 text-2xl font-semibold">Check your email</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Click the confirmation link to finish creating your account.
      </p>
      <VerifyPanel emailPromise={searchParams} />
    </div>
  );
}
