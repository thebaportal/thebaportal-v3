import { redirect } from "next/navigation";

export default function LoginRedirect({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const qs = new URLSearchParams(searchParams).toString();
  redirect(`/auth/login${qs ? `?${qs}` : ""}`);
}
