import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: roleData }, { data: ownerData }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle(),
      supabase.from("app_owners").select("user_id").eq("user_id", data.user.id).maybeSingle(),
    ]);
    return {
      user: data.user,
      role: roleData?.role ?? "tecnico",
      isOwner: ownerData !== null,
      hasEmailProvider: Array.isArray(data.user.app_metadata?.providers)
        ? data.user.app_metadata.providers.includes("email")
        : data.user.app_metadata?.provider === "email",
    };
  },
  component: () => <Outlet />,
});
