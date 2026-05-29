import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PublicRoomsList, type PublicRoom } from "@/components/rooms/public-rooms-list";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Rooms | Study Room Platform"
};

export default async function RoomsPage() {
  const supabase = await createSupabaseServerClient();
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

  const typedRooms = (rooms ?? []) as PublicRoom[];
  const roomIds = typedRooms.map((room) => room.id);
  const { data: memberRows } = roomIds.length
    ? await supabase.from("room_members").select("room_id").in("room_id", roomIds)
    : { data: [] };

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCounts.set(row.room_id, (memberCounts.get(row.room_id) ?? 0) + 1);
  }
  const initialMemberCounts = Object.fromEntries(memberCounts);

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

        <PublicRoomsList rooms={typedRooms} initialMemberCounts={initialMemberCounts} />
      </section>
    </main>
  );
}
