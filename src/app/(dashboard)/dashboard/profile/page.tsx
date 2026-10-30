import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileEditClient from "./ProfileEditClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Edit Profile</h1>
      <ProfileEditClient profile={profile} userId={user.id} />
    </div>
  );
}
