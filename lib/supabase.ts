import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalizeSupabaseUrl(url: string) {
  const parsedUrl = new URL(url.trim());
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/rest\/v1\/?$/, "");

  return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");
}

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return {
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl),
    supabaseAnonKey: supabaseAnonKey.trim()
  };
}

export function getSupabaseBrowserClient() {
  const config = assertSupabaseConfig();

  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}

export function createSupabaseServerClient() {
  const config = assertSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      }
    }
  });
}

export function createSupabaseRouteHandlerClient() {
  const config = assertSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      }
    }
  });
}

export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  const config = assertSupabaseConfig();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });
}
