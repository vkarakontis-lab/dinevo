#!/usr/bin/env node
// Give a restaurant owner/staff access to the dashboard.
//   node scripts/invite-owner.mjs <restaurant-slug> <email> [owner|manager|staff]
// Creates the auth user if needed (Supabase sends the invite email) and links them to the restaurant.
import { supabaseAdmin, fail, log } from './lib.mjs';

const [slug, email, role = 'owner'] = process.argv.slice(2);
if (!slug || !email) fail('usage: node scripts/invite-owner.mjs <restaurant-slug> <email> [owner|manager|staff]');
if (!['owner', 'manager', 'staff'].includes(role)) fail('role must be owner, manager or staff');

const sb = await supabaseAdmin();
const { data: restaurant, error: rErr } = await sb.from('restaurants').select('id').eq('slug', slug).maybeSingle();
if (rErr) fail(rErr.message);
if (!restaurant) fail(`no restaurant with slug '${slug}'`);

let userId;
const { data: invited, error: iErr } = await sb.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/dashboard`,
});
if (iErr) {
  // Already registered → look them up instead of failing.
  const { data: list, error: lErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (lErr) fail(lErr.message);
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) fail(`invite failed: ${iErr.message}`);
  userId = found.id;
  log(`${email} already has an account — linking existing user`);
} else {
  userId = invited.user.id;
  log(`invite email sent to ${email}`);
}

const { error: mErr } = await sb.from('restaurant_members').upsert({ user_id: userId, restaurant_id: restaurant.id, role }, { onConflict: 'user_id,restaurant_id' });
if (mErr) fail(mErr.message);
log(`${email} is now ${role} of ${slug}`);
