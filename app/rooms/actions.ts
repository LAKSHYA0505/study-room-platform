"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

async function requireUser() {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    user
  };
}

export async function createRoom(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const isPublic = formData.get("is_public") === "on";

  if (!name) {
    redirect("/rooms/create?error=missing-name");
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      name,
      subject: subject || null,
      is_public: isPublic,
      created_by: user.id
    })
    .select("id")
    .single();

  if (roomError || !room) {
    redirect("/rooms/create?error=create-failed");
  }

  await supabase.from("room_members").upsert(
    {
      room_id: room.id,
      user_id: user.id
    },
    {
      onConflict: "room_id,user_id",
      ignoreDuplicates: true
    }
  );

  revalidatePath("/rooms");
  redirect(`/rooms/${room.id}`);
}

export async function joinRoom(roomId: string) {
  const { supabase, user } = await requireUser();

  await supabase.from("room_members").upsert(
    {
      room_id: roomId,
      user_id: user.id
    },
    {
      onConflict: "room_id,user_id",
      ignoreDuplicates: true
    }
  );

  revalidatePath("/rooms");
  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function leaveRoom(roomId: string) {
  const { supabase, user } = await requireUser();

  await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user.id);

  revalidatePath("/rooms");
  revalidatePath(`/rooms/${roomId}`);
  redirect("/rooms");
}
