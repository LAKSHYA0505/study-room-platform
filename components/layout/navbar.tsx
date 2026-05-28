import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function Navbar() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let username: string | null = null;

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    username = profile?.username ?? null;
  }

  return (
    <header className="border-b bg-card">
      <nav className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Study Room
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/rooms">Rooms</Link>
              </Button>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {username ?? user.email}
              </span>
              <form action={logout}>
                <Button type="submit" variant="outline">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
