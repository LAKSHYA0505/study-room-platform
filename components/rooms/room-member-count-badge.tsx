"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type RoomMemberCountBadgeProps = {
  roomId: string;
  initialCount: number;
};

function getMemberLabel(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function RoomMemberCountBadge({ roomId, initialCount }: RoomMemberCountBadgeProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [memberCount, setMemberCount] = useState(initialCount);

  const loadMemberCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("room_members")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (!error && typeof count === "number") {
      setMemberCount(count);
    }
  }, [roomId, supabase]);

  useEffect(() => {
    void loadMemberCount();

    const channel = supabase
      .channel(`room-member-count:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members"
        },
        () => {
          void loadMemberCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMemberCount, roomId, supabase]);

  return <Badge variant="outline">{getMemberLabel(memberCount)}</Badge>;
}
