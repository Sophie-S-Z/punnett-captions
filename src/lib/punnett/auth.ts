export function isProtectedPath(path: string): boolean {
  return ["/profile", "/history", "/lab/notebook", "/discover"].some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function authCallbackUrl(origin: string): string {
  return new URL("/auth/callback", origin).toString();
}
