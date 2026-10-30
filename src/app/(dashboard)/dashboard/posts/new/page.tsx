import { requireUser } from "@/lib/auth/session";
import PostEditor from "@/components/editor/PostEditor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Post" };

export default async function NewPostPage() {
  await requireUser();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Write a new post</h1>
      <PostEditor />
    </div>
  );
}
