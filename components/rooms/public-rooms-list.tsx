"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { joinRoom } from "@/app/rooms/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type PublicRoom = {
  id: string;
  name: string;
  subject: string | null;
  created_at: string;
};

type RoomMemberChange = {
  room_id?: string;
};

type PublicRoomsListProps = {
  rooms: PublicRoom[];
  initialMemberCounts: Record<string, number>;
};

function getMemberLabel(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function PublicRoomsList({ rooms, initialMemberCounts }: PublicRoomsListProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [memberCounts, setMemberCounts] = useState(initialMemberCounts);

  useEffect(() => {
    const roomIds = new Set(rooms.map((room) => room.id));
    const channel = supabase
      .channel("public-room-members")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members"
        },
        (payload) => {
          const newRow = payload.new as RoomMemberChange;
          const oldRow = payload.old as RoomMemberChange;
          const roomId = newRow.room_id ?? oldRow.room_id;

          if (!roomId || !roomIds.has(roomId)) {
            return;
          }

          setMemberCounts((currentCounts) => {
            const currentCount = currentCounts[roomId] ?? 0;

            if (payload.eventType === "INSERT") {
              return {
                ...currentCounts,
                [roomId]: currentCount + 1
              };
            }

            if (payload.eventType === "DELETE") {
              return {
                ...currentCounts,
                [roomId]: Math.max(0, currentCount - 1)
              };
            }

            return currentCounts;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [rooms, supabase]);

  if (!rooms.length) {
    return (
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
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => {
        const memberCount = memberCounts[room.id] ?? 0;

        return (
          <Card key={room.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                  <CardDescription className="mt-2">{room.subject || "General study"}</CardDescription>
                </div>
                <Badge>{getMemberLabel(memberCount)}</Badge>
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
        );
      })}
    </div>
  );
}
