"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data } = await sb
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) throw new Error("not_allowed");
  return sb;
}

export async function setRestaurantStatus(
  restaurantId: string,
  status: "draft" | "published" | "archived",
): Promise<{ ok: boolean }> {
  try {
    const sb = await requireAdmin();
    const { error } = await sb
      .from("restaurants")
      .update({ status })
      .eq("id", restaurantId);
    if (error) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function setRestaurantFeatured(
  restaurantId: string,
  isFeatured: boolean,
): Promise<{ ok: boolean }> {
  try {
    const sb = await requireAdmin();
    const { error } = await sb
      .from("restaurants")
      .update({ is_featured: isFeatured })
      .eq("id", restaurantId);
    if (error) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
