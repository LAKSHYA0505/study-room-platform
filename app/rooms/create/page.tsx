import Link from "next/link";

import { createRoom } from "@/app/rooms/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateRoomPageProps = {
  searchParams?: {
    error?: string;
    details?: string;
  };
};

const errorMessages: Record<string, string> = {
  "missing-name": "Room name is required.",
  "profile-failed": "Could not prepare your profile for room creation.",
  "create-failed": "Could not create the room.",
  "member-failed": "The room was created, but adding you as a member failed."
};

export default function CreateRoomPage({ searchParams }: CreateRoomPageProps) {
  const errorMessage = searchParams?.error ? errorMessages[searchParams.error] : null;
  const errorDetails = searchParams?.details;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rooms</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create a study room</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/rooms">Back to rooms</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Room details</CardTitle>
            <CardDescription>Set up the room your group will use for study sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createRoom} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Room name</Label>
                <Input id="name" name="name" placeholder="Math exam prep" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Calculus" />
              </div>
              <label className="flex items-center justify-between gap-4 rounded-md border p-4">
                <span>
                  <span className="block text-sm font-medium">Public room</span>
                  <span className="block text-sm text-muted-foreground">Public rooms appear in the rooms list.</span>
                </span>
                <input
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                  type="checkbox"
                  name="is_public"
                  defaultChecked
                />
              </label>
              {errorMessage ? (
                <div className="space-y-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
                  <p>{errorMessage}</p>
                  {errorDetails ? <p className="font-mono text-xs leading-5">{errorDetails}</p> : null}
                </div>
              ) : null}
              <Button type="submit" className="w-full sm:w-auto">
                Create room
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
