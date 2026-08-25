import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveRestaurant } from "@/lib/dashboard/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { TeamActions, InviteForm } from "./team-actions";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const { active, userId, isAdmin } = await requireActiveRestaurant(locale);
  const { restaurant } = active;
  const canManage = active.role === "owner" || isAdmin;

  // RLS only exposes the caller's own membership row, so the full member
  // list (and their emails, which live in auth.users) comes from the
  // server-only admin client. Falls back to just the caller's row.
  let members: { user_id: string; role: string }[] = [];
  const emails = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurant_members")
      .select("user_id, role")
      .eq("restaurant_id", restaurant.id);
    members = data ?? [];
    await Promise.all(
      members.map(async (m) => {
        const { data: u } = await admin.auth.admin.getUserById(m.user_id);
        if (u?.user?.email) emails.set(m.user_id, u.user.email);
      }),
    );
  } catch {
    // no service key locally — show what RLS allows (the caller themself)
    const sb = await createClient();
    const { data } = await sb
      .from("restaurant_members")
      .select("user_id, role")
      .eq("restaurant_id", restaurant.id);
    members = data ?? [];
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold">{t("team")}</h1>
      <div className="mt-4 space-y-2">
        {(members ?? []).map((m) => (
          <div
            key={m.user_id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {emails.get(m.user_id) ?? m.user_id}
            </span>
            <Badge variant="secondary">{m.role}</Badge>
            {canManage && m.user_id !== userId ? (
              <TeamActions
                restaurantId={restaurant.id}
                memberUserId={m.user_id}
              />
            ) : null}
          </div>
        ))}
      </div>
      {canManage ? (
        <div className="mt-6">
          <InviteForm restaurantId={restaurant.id} />
        </div>
      ) : null}
    </div>
  );
}
