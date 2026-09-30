import { adminDataFetch } from "@/lib/admin-data-fetch";

/**
 * Admin roster + role checks. All calls go to this app's own `admin-data`
 * edge function (the old shared PublishNow admin service is retired and
 * unreachable). Admin authority comes only from the user_roles table.
 */
export const adminApi = {
  listAdmins: () => adminDataFetch("list-admins"),

  promoteAdmin: (email: string) => adminDataFetch("promote-admin", { email }),

  demoteAdmin: (userId: string) => adminDataFetch("demote-admin", { user_id: userId }),

  isSuperAdmin: () => adminDataFetch("check-super-admin"),

  // PublishNow cross-platform admin is a separate product; its service is
  // not reachable from Authors Bureau, so the Platforms tab stays hidden.
  checkPublishNowAdmin: async () => ({ is_super_admin: false }),

  listPlatformUsers: async () => ({ users: [] }),

  togglePlatformAccess: async (_userId: string, _platform: string, _enabled: boolean) => {
    throw new Error("Platform access is managed inside PublishNow.io.");
  },
};
