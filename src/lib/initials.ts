/**
 * The one initials rule for every avatar (sidebar, Settings preview).
 *
 * "Omojo Amanyi" → "OA" (first + last word), "Omojo" → "O",
 * no name → first letter of the email, nothing at all → "?".
 */
export function getInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email?.trim()[0] ?? "?").toUpperCase();
}
