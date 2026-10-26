import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AccessRestricted } from "@/components/access-restricted";
import { AppUpdateSettings } from "@/components/app-updater";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — Swap Display Dash" }] }),
  beforeLoad: ({ context }) => ({ hasEmailProvider: context.hasEmailProvider }),
  component: MinhaContaRoute,
});

function MinhaContaRoute() {
  const { hasEmailProvider } = Route.useRouteContext();
  return hasEmailProvider ? (
    <MinhaConta />
  ) : (
    <AccessRestricted
      message="A alteração de senha está disponível apenas para contas com e-mail e senha."
      action={
        <div className="space-y-3">
          <SignOutButton />
          <AppUpdateSettings />
        </div>
      }
    />
  );
}

function MinhaConta() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link to="/">← Voltar ao monitor</Link>
          </Button>
          <SignOutButton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Minha conta</CardTitle>
            <CardDescription>Altere a senha da sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void changePassword(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Alterar senha"}
              </Button>
            </form>
            <div className="mt-6 border-t pt-4">
              <AppUpdateSettings />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
