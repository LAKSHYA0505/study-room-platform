import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { username, email, password } = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };
  const trimmedUsername = username?.trim();

  if (!trimmedUsername || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseRouteHandlerClient();
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
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  if (data.session) {
    return NextResponse.json({ redirectTo: "/dashboard" });
  }

  return NextResponse.json({
    message: "Check your email to confirm your account, then log in."
  });
}
