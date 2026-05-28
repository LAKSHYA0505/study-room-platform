"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

type SupabaseServerClient = ReturnType<typeof createSupabaseRouteHandlerClient>;

function redirectWithRoomError(code: string, message?: string): never {
  const params = new URLSearchParams({ error: code });

  if (message) {
    params.set("details", message);
  }

  redirect(`/rooms/create?${params.toString()}`);
}

function getFallbackUsername(user: User) {
  const metadataUsername = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null;
  const emailUsername = user.email?.split("@")[0] ?? "student";
  const baseUsername = (metadataUsername || emailUsername).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

  return `${baseUsername || "student"}_${user.id.slice(0, 8)}`;
}

async function ensureProfile(supabase: SupabaseServerClient, user: User) {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read profile before room action", readError);
    return readError;
  }

  if (profile) {
    return null;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    username: getFallbackUsername(user)
  });

  if (insertError) {
    console.error("Failed to create missing profile before room action", insertError);
  }

  return insertError;
}

async function requireUser() {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to read Supabase server session", error);
  }

  if (error || !user) {
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

  const profileError = await ensureProfile(supabase, user);

  if (profileError) {
    redirectWithRoomError("profile-failed", profileError.message);
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
    console.error("Failed to create room", roomError);
    redirectWithRoomError("create-failed", roomError?.message ?? "Supabase did not return the created room.");
  }

  const { error: memberError } = await supabase.from("room_members").upsert(
    {
      room_id: room.id,
      user_id: user.id
    },
    {
      onConflict: "room_id,user_id",
      ignoreDuplicates: true
    }
  );

  if (memberError) {
    console.error("Failed to add creator to room_members", memberError);
    redirectWithRoomError("member-failed", memberError.message);
  }

  revalidatePath("/rooms");
  redirect(`/rooms/${room.id}`);
}

export async function joinRoom(roomId: string) {
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user);

  if (profileError) {
    console.error("Failed to ensure profile before joining room", profileError);
    redirect(`/rooms/${roomId}?error=${encodeURIComponent(profileError.message)}`);
  }

  const { error } = await supabase.from("room_members").upsert(
    {
      room_id: roomId,
      user_id: user.id
    },
    {
      onConflict: "room_id,user_id",
      ignoreDuplicates: true
    }
  );

  if (error) {
    console.error("Failed to join room", error);
    redirect(`/rooms/${roomId}?error=${encodeURIComponent(error.message)}`);
  }

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
