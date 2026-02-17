import { supabase } from "./supabase";

// Get current session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user profile (with role, company_id etc)
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*, company:companies(id, name)")
    .eq("id", session.user.id)
    .single();
  return data;
}

// Get companies linked to this TM
export async function getTMCompanies(tmId) {
  const { data } = await supabase
    .from("tm_companies")
    .select("company_id, company:companies(*)")
    .eq("tm_id", tmId);
  return (data || []).map(r => r.company);
}

// Sign up a new TM
export async function signUpTM(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: "tm" }
    }
  });
  return { data, error };
}

// Sign up a company admin (from invitation)
export async function signUpCompanyAdmin(email, password, fullName, companyId, token) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: "company_admin" }
    }
  });
  if (error) return { data, error };

  // Update profile with company_id
  if (data.user) {
    await supabase.from("profiles").update({ company_id: companyId, role: "company_admin" }).eq("id", data.user.id);
    // Mark invitation as accepted
    if (token) await supabase.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("token", token);
  }
  return { data, error };
}

// Sign in
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}

// Password reset
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/login?reset=true"
  });
  return { data, error };
}

// Listen for auth changes
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
