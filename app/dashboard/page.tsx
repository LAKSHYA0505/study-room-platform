import Link from "next/link";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Dashboard | Study Room Platform"
};

type ParticipantSessionRow = {
  study_sessions:
    | {
        id: string;
        room_id: string;
        started_at: string;
        ended_at: string | null;
        duration_seconds: number | null;
        rooms:
          | {
              name: string;
            }
          | null
          | Array<{
              name: string;
            }>;
      }
    | null
    | Array<{
        id: string;
        room_id: string;
        started_at: string;
        ended_at: string | null;
        duration_seconds: number | null;
        rooms:
          | {
              name: string;
            }
          | null
          | Array<{
              name: string;
            }>;
      }>;
};

function getSession(row: ParticipantSessionRow) {
  return Array.isArray(row.study_sessions) ? row.study_sessions[0] : row.study_sessions;
}

function getRoomName(session: NonNullable<ReturnType<typeof getSession>>) {
  const room = Array.isArray(session.rooms) ? session.rooms[0] : session.rooms;

  return room?.name ?? "Deleted room";
}

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
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
  const { data: participantRows } = await supabase
    .from("session_participants")
    .select("study_sessions(id, room_id, started_at, ended_at, duration_seconds, rooms(name))")
    .eq("user_id", user.id);
  const { count: roomsJoined } = await supabase
    .from("room_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const sessions = ((participantRows ?? []) as unknown as ParticipantSessionRow[])
    .map(getSession)
    .filter((session): session is NonNullable<typeof session> => Boolean(session));
  const completedSessions = sessions.filter((session) => typeof session.duration_seconds === "number");
  const totalSeconds = completedSessions.reduce((total, session) => total + (session.duration_seconds ?? 0), 0);
  const weekStart = getStartOfWeek();
  const sessionsThisWeek = completedSessions.filter((session) => new Date(session.started_at) >= weekStart).length;
  const recentSessions = completedSessions
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 6);

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
              Track your focus time, recent sessions, and room activity.
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
              <CardTitle>{formatHours(totalSeconds)} hrs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Across all completed Pomodoro sessions.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Sessions this week</CardDescription>
              <CardTitle>{sessionsThisWeek}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Completed sessions since Monday.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Rooms joined</CardDescription>
              <CardTitle>{roomsJoined ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Rooms where you are currently a member.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent study sessions</CardTitle>
            <CardDescription>Your latest completed focus sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length ? (
              <div className="divide-y rounded-md border">
                {recentSessions.map((session) => (
                  <div key={session.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{getRoomName(session)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short"
                        }).format(new Date(session.started_at))}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.ended_at
                        ? `Ended ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(
                            new Date(session.ended_at)
                          )}`
                        : "In progress"}
                    </p>
                    <p className="font-medium">{formatDuration(session.duration_seconds ?? 0)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border p-4 text-sm text-muted-foreground">
                Complete a Pomodoro session to see your history here.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
