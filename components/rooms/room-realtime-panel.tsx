"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { PomodoroTimer } from "@/components/rooms/pomodoro-timer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type RoomMember = {
  userId: string;
  username: string;
};

type CurrentUser = {
  id: string;
  username: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
};

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles:
    | {
        username: string;
      }
    | null
    | Array<{
        username: string;
      }>;
};

type PresencePayload = {
  user_id?: string;
  username?: string;
  online_at?: string;
};

type RoomRealtimePanelProps = {
  roomId: string;
  inviteUrl: string;
  currentUser: CurrentUser;
  members: RoomMember[];
  isCreator: boolean;
};

function getMessageUsername(message: MessageRow, memberNames: Map<string, string>) {
  const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;

  return profile?.username ?? memberNames.get(message.user_id) ?? "Unknown user";
}

function formatMessageTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function RoomRealtimePanel({ roomId, inviteUrl, currentUser, members, isCreator }: RoomRealtimePanelProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.userId, member.username])),
    [members]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("id, room_id, user_id, content, created_at, profiles(username)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        return;
      }

      const rows = (data ?? []) as unknown as MessageRow[];
      setMessages(
        rows.map((message) => ({
          id: message.id,
          room_id: message.room_id,
          user_id: message.user_id,
          content: message.content,
          created_at: message.created_at,
          username: getMessageUsername(message, memberNames)
        }))
      );
    }

    void loadMessages();

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: currentUser.id
        }
      }
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const row = payload.new as Omit<MessageRow, "profiles">;

          setMessages((currentMessages) => {
            if (currentMessages.some((message) => message.id === row.id)) {
              return currentMessages;
            }

            return [
              ...currentMessages,
              {
                id: row.id,
                room_id: row.room_id,
                user_id: row.user_id,
                content: row.content,
                created_at: row.created_at,
                username:
                  row.user_id === currentUser.id
                    ? currentUser.username
                    : memberNames.get(row.user_id) ?? "Unknown user"
              }
            ];
          });
        }
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<PresencePayload>();
        const nextOnlineIds = new Set<string>();

        Object.entries(presenceState).forEach(([presenceKey, presences]) => {
          nextOnlineIds.add(presenceKey);
          presences.forEach((presence) => {
            if (presence.user_id) {
              nextOnlineIds.add(presence.user_id);
            }
          });
        });

        setOnlineUserIds(nextOnlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.username,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.username, memberNames, roomId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    setError(null);
    setIsSending(true);

    const { error: sendError } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: currentUser.id,
      content: trimmedContent
    });

    setIsSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setContent("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <PomodoroTimer roomId={roomId} currentUserId={currentUser.id} isCreator={isCreator} />

        <Card className="min-h-[560px]">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Messages update live for everyone in this room.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[460px] flex-col gap-4">
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-background p-4">
              {messages.length ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{message.username}</span>
                        <span className="text-xs text-muted-foreground">{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No messages yet. Start the conversation.
                </div>
              )}
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">{error}</p>
            ) : null}

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                aria-label="Message"
                placeholder="Type a message..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <Button type="submit" disabled={isSending || !content.trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
            <CardDescription>Share this URL with classmates to add them to the room.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input readOnly value={inviteUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>People currently joined to this study room.</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length ? (
              <div className="space-y-3">
                {members.map((member) => {
                  const isOnline = onlineUserIds.has(member.userId);

                  return (
                    <div key={member.userId} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted"}`}
                          aria-label={isOnline ? "Online" : "Offline"}
                        />
                        <span className="truncate font-medium">{member.username}</span>
                      </div>
                      {member.userId === currentUser.id ? <Badge variant="secondary">You</Badge> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
