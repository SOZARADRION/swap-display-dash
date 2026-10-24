import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SignOutButton() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Você saiu da conta");
    await navigate({ to: "/auth" });
  };

  return (
    <Button type="button" variant="ghost" onClick={() => void handleSignOut()}>
      Sair
    </Button>
  );
}
