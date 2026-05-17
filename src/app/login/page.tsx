import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <LoginForm nextPromise={searchParams} />
    </div>
  );
}
