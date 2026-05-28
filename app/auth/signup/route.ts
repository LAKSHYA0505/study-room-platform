import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

function getProfileCreationErrorMessage(message: string) {
  if (message.includes("public.profiles")) {
    return "The Supabase database schema is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor, then try signing up again.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  const { username, email, password, next } = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
    next?: string | null;
  };
  const trimmedUsername = username?.trim();

  if (!trimmedUsername || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required." }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      data: {
        username: trimmedUsername
      }
    }
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      username: trimmedUsername
    });

    if (profileError) {
      return NextResponse.json({ error: getProfileCreationErrorMessage(profileError.message) }, { status: 400 });
    }
  }

  if (data.session) {
    return NextResponse.json({ redirectTo: next || "/dashboard" });
  }

  return NextResponse.json({
    message: "Check your email to confirm your account, then log in."
  });
}
