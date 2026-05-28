import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { email, password, next } = (await request.json()) as {
    email?: string;
    password?: string;
    next?: string | null;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseRouteHandlerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ redirectTo: next || "/dashboard" });
}
