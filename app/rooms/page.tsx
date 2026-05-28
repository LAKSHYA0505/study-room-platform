import Link from "next/link";
import { redirect } from "next/navigation";

import { joinRoom } from "@/app/rooms/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase";

type Room = {
  id: string;
  name: string;
  subject: string | null;
  created_at: string;
};

export default async function RoomsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/rooms");
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, subject, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const typedRooms = (rooms ?? []) as Room[];
  const roomIds = typedRooms.map((room) => room.id);
  const { data: memberRows } = roomIds.length
    ? await supabase.from("room_members").select("room_id").in("room_id", roomIds)
    : { data: [] };

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCounts.set(row.room_id, (memberCounts.get(row.room_id) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rooms</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Public study rooms</h1>
            <p className="mt-2 text-muted-foreground">Join an existing room or create one for your group.</p>
          </div>
          <Button asChild>
            <Link href="/rooms/create">Create room</Link>
          </Button>
        </div>

        {typedRooms.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {typedRooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{room.name}</CardTitle>
                      <CardDescription className="mt-2">{room.subject || "General study"}</CardDescription>
                    </div>
                    <Badge>{memberCounts.get(room.id) ?? 0} members</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Open this room to see members and the invite link.</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <form action={joinRoom.bind(null, room.id)}>
                    <Button type="submit">Join</Button>
                  </form>
                  <Button asChild variant="outline">
                    <Link href={`/rooms/${room.id}`}>View</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No public rooms yet</CardTitle>
              <CardDescription>Create the first room and invite your study group.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/rooms/create">Create room</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </section>
    </main>
  );
}
