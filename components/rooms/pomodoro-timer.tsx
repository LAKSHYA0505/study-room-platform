"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type TimerMode = "work" | "break";

type TimerState = {
  isRunning: boolean;
  timeLeft: number;
  mode: TimerMode;
  activeSessionId: string | null;
  elapsedSeconds: number;
};

type TimerBroadcastPayload = TimerState & {
  sentAt: string;
};

type ActiveSessionRow = {
  id: string;
  started_at: string;
};

type PomodoroTimerProps = {
  roomId: string;
  currentUserId: string;
  isCreator: boolean;
};

function getModeDuration(mode: TimerMode) {
  return mode === "work" ? WORK_SECONDS : BREAK_SECONDS;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getInitialTimerState(): TimerState {
  return {
    isRunning: false,
    timeLeft: WORK_SECONDS,
    mode: "work",
    activeSessionId: null,
    elapsedSeconds: 0
  };
}

export function PomodoroTimer({ roomId, currentUserId, isCreator }: PomodoroTimerProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(() => getInitialTimerState());
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const timerStateRef = useRef(timerState);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  const ensureParticipant = useCallback(
    async (sessionId: string) => {
      const { error: participantError } = await supabase.from("session_participants").upsert(
        {
          session_id: sessionId,
          user_id: currentUserId
        },
        {
          onConflict: "session_id,user_id",
          ignoreDuplicates: true
        }
      );

      if (participantError) {
        setError(participantError.message);
      }
    },
    [currentUserId, supabase]
  );

  const broadcastTimerState = useCallback(async (nextState: TimerState) => {
    await channelRef.current?.send({
      type: "broadcast",
      event: "timer",
      payload: {
        ...nextState,
        sentAt: new Date().toISOString()
      } satisfies TimerBroadcastPayload
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const channel = supabase.channel(`timer:${roomId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "timer" }, async ({ payload }) => {
        const nextState = payload as TimerBroadcastPayload;

        if (!isMounted) {
          return;
        }

        setTimerState({
          isRunning: nextState.isRunning,
          timeLeft: nextState.timeLeft,
          mode: nextState.mode,
          activeSessionId: nextState.activeSessionId,
          elapsedSeconds: nextState.elapsedSeconds
        });

        if (nextState.activeSessionId && nextState.isRunning) {
          await ensureParticipant(nextState.activeSessionId);
        }
      })
      .subscribe();

    async function loadActiveSession() {
      const { data, error: sessionError } = await supabase
        .from("study_sessions")
        .select("id, started_at")
        .eq("room_id", roomId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const activeSession = data as ActiveSessionRow | null;

      if (activeSession) {
        await ensureParticipant(activeSession.id);
        setTimerState((currentState) => ({
          ...currentState,
          activeSessionId: activeSession.id
        }));
      }
    }

    void loadActiveSession();

    return () => {
      isMounted = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [ensureParticipant, roomId, supabase]);

  useEffect(() => {
    if (!timerState.isRunning || !isCreator) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerState((currentState) => {
        if (!currentState.isRunning) {
          return currentState;
        }

        const nextMode = currentState.timeLeft <= 1 ? (currentState.mode === "work" ? "break" : "work") : currentState.mode;
        const nextTimeLeft = currentState.timeLeft <= 1 ? getModeDuration(nextMode) : currentState.timeLeft - 1;
        const nextState = {
          ...currentState,
          mode: nextMode,
          timeLeft: nextTimeLeft,
          elapsedSeconds: currentState.elapsedSeconds + 1
        };

        void broadcastTimerState(nextState);
        return nextState;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [broadcastTimerState, isCreator, timerState.isRunning]);

  async function startTimer() {
    if (!isCreator || isMutating) {
      return;
    }

    setError(null);
    setIsMutating(true);

    let activeSessionId = timerStateRef.current.activeSessionId;

    if (!activeSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("study_sessions")
        .insert({
          room_id: roomId,
          started_by: currentUserId,
          started_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        setError(sessionError?.message ?? "Could not create a study session.");
        setIsMutating(false);
        return;
      }

      activeSessionId = session.id;
      if (!activeSessionId) {
        setError("Could not read the new study session id.");
        setIsMutating(false);
        return;
      }

      await ensureParticipant(activeSessionId);
    }

    const nextState: TimerState = {
      ...timerStateRef.current,
      isRunning: true,
      activeSessionId
    };

    setTimerState(nextState);
    await broadcastTimerState(nextState);
    setIsMutating(false);
  }

  async function pauseTimer() {
    if (!isCreator || isMutating) {
      return;
    }

    const nextState: TimerState = {
      ...timerStateRef.current,
      isRunning: false
    };

    setTimerState(nextState);
    await broadcastTimerState(nextState);
  }

  async function stopTimer() {
    if (!isCreator || isMutating) {
      return;
    }

    setError(null);
    setIsMutating(true);

    const currentState = timerStateRef.current;

    if (currentState.activeSessionId) {
      const { error: sessionError } = await supabase
        .from("study_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: currentState.elapsedSeconds
        })
        .eq("id", currentState.activeSessionId);

      if (sessionError) {
        setError(sessionError.message);
        setIsMutating(false);
        return;
      }
    }

    const nextState = getInitialTimerState();
    setTimerState(nextState);
    await broadcastTimerState(nextState);
    setIsMutating(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Pomodoro timer</CardTitle>
            <CardDescription>Synced focus and break cycles for everyone in this room.</CardDescription>
          </div>
          <Badge variant={timerState.mode === "work" ? "default" : "secondary"}>
            {timerState.mode === "work" ? "Work" : "Break"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border bg-background p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {timerState.isRunning ? "Running" : timerState.activeSessionId ? "Paused" : "Ready"}
          </p>
          <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">{formatTime(timerState.timeLeft)}</p>
        </div>

        {isCreator ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={startTimer} disabled={isMutating || timerState.isRunning}>
              Start
            </Button>
            <Button type="button" variant="outline" onClick={pauseTimer} disabled={isMutating || !timerState.isRunning}>
              Pause
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={stopTimer}
              disabled={isMutating || (!timerState.activeSessionId && !timerState.isRunning)}
            >
              Stop
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Only the room creator can start or stop the timer.</p>
        )}

        {error ? (
          <p className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
