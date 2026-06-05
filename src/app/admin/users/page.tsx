"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

type Role = "admin" | "editor" | null;
type UserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  envAdmin: boolean;
  lastActive: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  user: "Người dùng",
};
const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  editor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  user: "bg-white/5 text-muted border-white/10",
};

export default function AdminUsersPage() {
  const { key, isAdmin, ready } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // id đang đổi role
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-admin-key": key } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      setUsers(data.users ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được danh sách.");
    }
  }, [key]);

  useEffect(() => {
    if (key && isAdmin) load();
  }, [key, isAdmin, load]);

  async function setRole(u: UserRow, role: Role) {
    if (u.envAdmin) return;
    setBusy(u.id);
    setErr("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ id: u.id, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
      setMsg(`Đã cập nhật quyền cho ${u.email}.`);
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi cập nhật.");
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return <div className="py-20 text-center text-xs font-black uppercase tracking-wider text-muted">Đang tải…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <p className="text-sm font-bold text-rose-400">Chỉ tài khoản admin mới quản lý được tài khoản & phân quyền.</p>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      !q ||
      u.email?.toLowerCase().includes(q.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(q.toLowerCase()),
  );
  const counts = {
    admin: users.filter((u) => u.role === "admin").length,
    editor: users.filter((u) => u.role === "editor").length,
    total: users.length,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-zinc-400">
          {counts.total} tài khoản · <span className="text-primary">{counts.admin}</span> admin ·{" "}
          <span className="text-amber-400">{counts.editor}</span> editor
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm email / tên…"
          className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-primary placeholder:text-muted/60"
        />
      </div>

      {msg && <p className="mb-3 rounded-lg bg-teal-500/15 px-3 py-2 text-xs font-black text-teal-300">{msg}</p>}
      {err && <p className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-black text-rose-300">{err}</p>}

      <div className="rounded-2xl border border-white/10 bg-[#161619] p-3 text-[11px] font-semibold text-muted leading-relaxed">
        <b className="text-zinc-300">Phân quyền:</b> <b className="text-primary">Admin</b> = toàn quyền (sửa nội dung + quản lý tài khoản).{" "}
        <b className="text-amber-400">Editor</b> = chỉ sửa nội dung (bài học, video, bài tập). Người dùng thường không vào được CMS.
      </div>

      <div className="mt-3 space-y-2">
        {filtered.map((u) => {
          const roleKey = u.role ?? "user";
          return (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#161619] px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
                {(u.displayName || u.email || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {u.displayName || u.email}
                  {u.envAdmin && (
                    <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary">
                      cố định
                    </span>
                  )}
                </p>
                {u.displayName && <p className="truncate text-[11px] text-muted">{u.email}</p>}
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${ROLE_BADGE[roleKey]}`}>
                {ROLE_LABEL[roleKey]}
              </span>
              {u.envAdmin ? (
                <span className="text-[10px] font-bold text-muted/70">ADMIN_EMAILS</span>
              ) : (
                <select
                  value={u.role ?? ""}
                  disabled={busy === u.id}
                  onChange={(e) => setRole(u, (e.target.value || null) as Role)}
                  className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Người dùng</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-xs font-semibold text-muted">Không có tài khoản phù hợp.</p>
        )}
      </div>
    </div>
  );
}
