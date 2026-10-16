import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Enums } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type AppAccess = {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  role: Enums<"app_role"> | null;
  isOwner: boolean;
  hasEmailProvider: boolean;
};

const initialAccess: AppAccess = {
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  role: null,
  isOwner: false,
  hasEmailProvider: false,
};

function hasEmailProvider(user: User | null): boolean {
  const providers = user?.app_metadata?.providers;
  return Array.isArray(providers) ? providers.includes("email") : user?.app_metadata?.provider === "email";
}

export function useAppAccess() {
  const [access, setAccess] = useState(initialAccess);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const loadAccess = async (user: User | null) => {
      const currentRequestId = ++requestId;
      const userId = user?.id ?? null;

      if (!userId) {
        if (active) setAccess({ ...initialAccess, isLoading: false });
        return;
      }

      if (active) {
        setAccess({
          isLoading: true,
          isAuthenticated: true,
          userId,
          role: null,
          isOwner: false,
          hasEmailProvider: false,
        });
      }

      const [roleResult, ownerResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("app_owners").select("user_id").eq("user_id", userId).maybeSingle(),
      ]);

      if (!active || currentRequestId !== requestId) return;

      setAccess({
        isLoading: false,
        isAuthenticated: true,
        userId,
        role: roleResult.data?.role ?? "tecnico",
        isOwner: ownerResult.data !== null,
        hasEmailProvider: hasEmailProvider(user),
      });
    };

    void supabase.auth.getSession().then(({ data }) => {
      void loadAccess(data.session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void loadAccess(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      requestId += 1;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return access;
}