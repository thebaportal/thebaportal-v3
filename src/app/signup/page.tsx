import { redirect } from "next/navigation";

export default function SignupRedirect({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const qs = new URLSearchParams(searchParams).toString();
  redirect(`/auth/signup${qs ? `?${qs}` : ""}`);
}
