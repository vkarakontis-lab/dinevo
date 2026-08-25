import { redirect } from "next/navigation";
import { getDashboardContext, type Membership } from "./context";

// Shared gate for dashboard pages: session + active restaurant, or redirect.
export async function requireActiveRestaurant(locale: string): Promise<{
  active: Membership;
  isAdmin: boolean;
  userId: string;
}> {
  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/dashboard/login`);
  if (!ctx.active) redirect(ctx.isAdmin ? `/${locale}/admin` : `/${locale}/dashboard`);
  return { active: ctx.active, isAdmin: ctx.isAdmin, userId: ctx.userId };
}
