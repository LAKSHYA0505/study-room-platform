import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { joinRoom, leaveRoom } from "@/app/rooms/actions";
import { RoomRealtimePanel } from "@/components/rooms/room-realtime-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase";

type RoomPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    invite?: string;
  };
};

export const metadata: Metadata = {
  title: "Room | Study Room Platform"
};

type Room = {
  id: string;
  name: string;
  subject: string | null;
  is_public: boolean | null;
  created_by: string | null;
};

type LeaderboardParticipantRow = {
  user_id: string;
  profiles:
    | {
        username: string;
      }
    | null
    | Array<{
        username: string;
      }>;
  study_sessions:
    | {
        room_id: string;
        duration_seconds: number | null;
      }
    | null
    | Array<{
        room_id: string;
        duration_seconds: number | null;
      }>;
};

type MemberRow = {
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null | Array<{
    username: string;
    avatar_url: string | null;
  }>;
};

function getProfile(member: MemberRow) {
  return Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
}

function getLeaderboardProfile(row: LeaderboardParticipantRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function getLeaderboardSession(row: LeaderboardParticipantRow) {
  return Array.isArray(row.study_sessions) ? row.study_sessions[0] : row.study_sessions;
}

export default async function RoomDetailPage({ params, searchParams }: RoomPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/rooms/${params.id}${searchParams?.invite ? "%3Finvite%3Dtrue" : ""}`);
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, subject, is_public, created_by")
    .eq("id", params.id)
    .single();

  if (!room) {
    notFound();
  }

  if (searchParams?.invite === "true") {
    await supabase.from("room_members").upsert(
      {
        room_id: params.id,
        user_id: user.id
      },
      {
        onConflict: "room_id,user_id",
        ignoreDuplicates: true
      }
    );
    redirect(`/rooms/${params.id}`);
  }

  const { data: members } = await supabase
    .from("room_members")
    .select("user_id, profiles(username, avatar_url)")
    .eq("room_id", params.id)
    .order("joined_at", { ascending: true });

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const { data: leaderboardRows } = await supabase
    .from("session_participants")
    .select("user_id, profiles(username), study_sessions(room_id, duration_seconds)")
    .eq("study_sessions.room_id", params.id);

  const typedRoom = room as Room;
  const typedMembers = (members ?? []) as unknown as MemberRow[];
  const isMember = typedMembers.some((member) => member.user_id === user.id);
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${protocol}://${host}/rooms/${params.id}?invite=true`;
  const roomMembers = typedMembers.map((member) => ({
    userId: member.user_id,
    username: getProfile(member)?.username ?? "Unknown user"
  }));
  const currentUsername =
    currentProfile?.username ??
    roomMembers.find((member) => member.userId === user.id)?.username ??
    user.email?.split("@")[0] ??
    "You";
  const leaderboardTotals = new Map<string, { userId: string; username: string; totalSeconds: number }>();

  for (const row of (leaderboardRows ?? []) as unknown as LeaderboardParticipantRow[]) {
    const session = getLeaderboardSession(row);

    if (!session || session.room_id !== params.id || !session.duration_seconds) {
      continue;
    }

    const existing = leaderboardTotals.get(row.user_id);
    const username = getLeaderboardProfile(row)?.username ?? "Unknown user";

    leaderboardTotals.set(row.user_id, {
      userId: row.user_id,
      username: existing?.username ?? username,
      totalSeconds: (existing?.totalSeconds ?? 0) + session.duration_seconds
    });
  }

  const leaderboard = Array.from(leaderboardTotals.values())
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Room</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{typedRoom.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{typedRoom.subject || "General study"}</Badge>
              <Badge variant={typedRoom.is_public ? "default" : "outline"}>
                {typedRoom.is_public ? "Public" : "Private"}
              </Badge>
              <Badge variant="outline">{typedMembers.length} members</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/rooms">Back to rooms</Link>
            </Button>
            {isMember ? (
              <form action={leaveRoom.bind(null, params.id)}>
                <Button type="submit" variant="destructive">
                  Leave room
                </Button>
              </form>
            ) : (
              <form action={joinRoom.bind(null, params.id)}>
                <Button type="submit">Join room</Button>
              </form>
            )}
          </div>
        </div>

        <RoomRealtimePanel
          roomId={params.id}
          inviteUrl={inviteUrl}
          currentUser={{
            id: user.id,
            username: currentUsername
          }}
          members={roomMembers}
          isCreator={typedRoom.created_by === user.id}
          leaderboard={leaderboard}
        />
      </section>
    </main>
  );
}
