import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {profile?.username ? `Hi, ${profile.username}` : "Your study room"}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Phase 1 is ready. Room management, chat, timers, and study stats will build from here.
            </p>
          </div>
          <Button asChild>
            <Link href="/rooms">Browse rooms</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total study time</CardDescription>
              <CardTitle>0.0 hrs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tracking starts once Pomodoro sessions are added.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Sessions this week</CardDescription>
              <CardTitle>0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your weekly activity will appear here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active rooms</CardDescription>
              <CardTitle>0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create or join rooms in Phase 2.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
