/** "jamil.uddin@x.com" -> "Jamil Uddin" when a name field holds an email; mirrors the original card. */
export function displayName(name?: string | null, email?: string | null): string | null {
  if (name && !name.includes("@")) return name;
  if (email && email !== "hidden") {
    return email
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return null;
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDate(value?: string | Date | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", opts);
}

export function timeAgo(value?: string | Date | null): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (isNaN(diff)) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : formatDate(value);
}

/** Firebase auth error code -> sentence a resident can act on. */
export function authErrorMessage(err: any): string {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and retry.";
    default:
      return err?.message?.replace("Firebase: ", "") || "Something went wrong. Please try again.";
  }
}
