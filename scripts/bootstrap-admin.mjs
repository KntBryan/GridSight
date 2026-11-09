import { createClient } from "@supabase/supabase-js";

const [targetEmailInput, actorLabelInput] = process.argv.slice(2);
const targetEmail = targetEmailInput?.trim().toLowerCase();
const actorLabel = actorLabelInput?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetEmail || !actorLabel) {
  console.error('Usage: npm run admin:bootstrap -- "confirmed-email" "operator name"');
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment.");
  process.exit(1);
}
if (actorLabel.length > 100) {
  console.error("The operator name must be 100 characters or fewer.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let target = null;
for (let page = 1; page <= 100; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.error("Supabase could not look up accounts. Check the URL and service-role key.");
    process.exit(1);
  }
  target = data.users.find((user) => user.email?.toLowerCase() === targetEmail) ?? null;
  if (target || data.users.length < 1000) break;
}

if (!target) {
  console.error("No matching account was found in the first 100,000 Supabase Auth users.");
  process.exit(1);
}
if (!target.email_confirmed_at) {
  console.error("The target account email must be confirmed before bootstrap.");
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", target.id)
  .maybeSingle();
if (profileError || !profile) {
  console.error("The target account does not have a profile. Apply all migrations and retry.");
  process.exit(1);
}

const { data: result, error: bootstrapError } = await supabase.rpc("bootstrap_first_admin", {
  p_target_id: target.id,
  p_actor_label: actorLabel,
});
if (bootstrapError) {
  console.error(`First-admin bootstrap failed: ${bootstrapError.message}`);
  process.exit(1);
}

console.log(result === "already_bootstrapped"
  ? "Bootstrap already completed for this account; no changes made."
  : "First administrator created successfully.");
