import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canEditPost } from "@/lib/utils/permissions";
import { notFound } from "next/navigation";
import EditPostClient from "./EditPostClient";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();
  if (!canEditPost(user, post)) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Edit post</h1>
      <EditPostClient post={post} />
    </div>
  );
}
