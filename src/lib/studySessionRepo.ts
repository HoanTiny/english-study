"use client";
import { supabase } from "./supabase";
import { parseStudySession } from "./studyPlan";
import type { CloudStudyState, StudyTransport } from "./studySync";

function parseCloud(row: { revision: number; session: unknown } | null, userId: string, day: string): CloudStudyState {
  if (!row) return { revision: 0, session: null };
  if (!Number.isSafeInteger(row.revision) || row.revision < 0) throw new Error("Invalid study revision");
  const session = row.session === null ? null : parseStudySession(JSON.stringify(row.session), userId, day);
  if (row.session !== null && !session) throw new Error("Invalid cloud study session");
  return { revision: row.revision, session };
}
export function studyTransport(userId: string, day: string): StudyTransport {
  const timed = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(10000)]);
  return {
    async read(signal) {
      const { data, error } = await supabase.from("study_sessions").select("revision,session")
        .eq("user_id", userId).eq("study_day", day).abortSignal(timed(signal)).maybeSingle();
      if (error) throw error;
      return parseCloud(data, userId, day);
    },
    async write(state, signal) {
      const { data, error } = await supabase.rpc("sync_study_session", {
        p_user: userId, p_day: day, p_expected_revision: state.revision, p_session: state.session,
      }).abortSignal(timed(signal));
      if (error) throw error;
      if (typeof data?.applied !== "boolean") throw new Error("Invalid study sync response");
      return { ...parseCloud(data, userId, day), applied: data.applied };
    },
  };
}
