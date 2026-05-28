import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Study Room Platform | Collaborative Focus Rooms"
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Collaborative study</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Study rooms that keep everyone focused together.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Sign in to create shared rooms, invite friends, and build toward synced Pomodoro sessions and live chat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium text-muted-foreground">Realtime study</p>
              <p className="mt-1 text-xl font-semibold">Rooms, chat, timers, and progress</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <p className="text-2xl font-semibold">25</p>
                <p className="text-sm text-muted-foreground">minute focus blocks</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-2xl font-semibold">Live</p>
                <p className="text-sm text-muted-foreground">collaboration</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
