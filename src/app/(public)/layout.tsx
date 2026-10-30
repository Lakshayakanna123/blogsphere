import { getCurrentUser } from "@/lib/auth/session";
import NavBar from "@/components/nav/NavBar";
import Footer from "@/components/nav/Footer";

/**
 * Shell layout wraps every public-facing page with the persistent nav + footer.
 * It fetches the current user server-side so the nav can render auth state
 * without a client round-trip.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <>
      <NavBar user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
