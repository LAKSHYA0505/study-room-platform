"use server";

import { redirect } from "next/navigation";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export async function logout() {
  const supabase = await createSupabaseRouteHandlerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
