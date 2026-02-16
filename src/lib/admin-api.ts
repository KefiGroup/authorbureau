import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";

const SOURCE_PLATFORM = "authorsbureau";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function callAdminAuth(body: Record<string, unknown>) {
  const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/admin-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, source_platform: SOURCE_PLATFORM }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}

async function callAdminStories(body: Record<string, unknown>) {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/admin-stories`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, source_platform: SOURCE_PLATFORM }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}

export const adminApi = {
  // Auth
  requestCode: (email: string) =>
    callAdminAuth({ email, action: "request_code" }),

  verify: (email: string, code: string) =>
    callAdminAuth({ email, action: "verify", code }),

  verifyToken: (token: string) =>
    callAdminAuth({ action: "verify_token", token }),

  passwordLogin: (email: string, password: string) =>
    callAdminAuth({ email, password, action: "password_login" }),

  // Data
  stats: () => callAdminStories({ action: "stats" }),

  listSubmissions: (page?: number, status?: string) =>
    callAdminStories({ action: "list", page, status }),

  updateSubmissionStatus: (id: string, status: string) =>
    callAdminStories({ action: "update_status", id, status }),

  listUsers: (page?: number) =>
    callAdminStories({ action: "list_users", page }),

  listBooks: (page?: number) =>
    callAdminStories({ action: "list_books", page }),

  listAdmins: () => callAdminStories({ action: "list_admins" }),

  promoteAdmin: (email: string) =>
    callAdminStories({ action: "promote_admin", email }),

  demoteAdmin: (userId: string) =>
    callAdminStories({ action: "demote_admin", user_id: userId }),

  isSuperAdmin: () => callAdminStories({ action: "check_super_admin" }),
};
