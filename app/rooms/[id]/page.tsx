import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { joinRoom, leaveRoom } from "@/app/rooms/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase";

type RoomPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    invite?: string;
  };
};

type Room = {
  id: string;
  name: string;
  subject: string | null;
  is_public: boolean | null;
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

export default async function RoomDetailPage({ params, searchParams }: RoomPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/rooms/${params.id}${searchParams?.invite ? "%3Finvite%3Dtrue" : ""}`);
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, subject, is_public")
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

  const typedRoom = room as Room;
  const typedMembers = (members ?? []) as unknown as MemberRow[];
  const isMember = typedMembers.some((member) => member.user_id === user.id);
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${protocol}://${host}/rooms/${params.id}?invite=true`;

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

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Room shell</CardTitle>
              <CardDescription>Chat and synced Pomodoro controls will live here in the next phases.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Phase 3: real-time chat. Phase 4: synced Pomodoro timer and study tracking.
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite link</CardTitle>
                <CardDescription>Share this URL with classmates to add them to the room.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input readOnly value={inviteUrl} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>People currently joined to this study room.</CardDescription>
              </CardHeader>
              <CardContent>
                {typedMembers.length ? (
                  <div className="space-y-3">
                    {typedMembers.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between rounded-md border p-3">
                        <span className="font-medium">{getProfile(member)?.username ?? "Unknown user"}</span>
                        {member.user_id === user.id ? <Badge variant="secondary">You</Badge> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
