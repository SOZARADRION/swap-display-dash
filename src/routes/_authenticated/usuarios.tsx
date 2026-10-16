import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccessRestricted } from "@/components/access-restricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { KeyRound } from "lucide-react";

type UserWithRole = {
  id: string;
  email: string | null;
  role: Enums<"app_role">;
  created_at: string;
  has_email_provider: boolean;
  is_owner: boolean;
};

const TEMP_PASSWORD_CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateTemporaryPassword() {
  const password: string[] = [];
  const randomBytes = new Uint8Array(24);
  const maxAcceptedByte = Math.floor(256 / TEMP_PASSWORD_CHARACTERS.length) * TEMP_PASSWORD_CHARACTERS.length;

  while (password.length < 12) {
    crypto.getRandomValues(randomBytes);
    for (const randomByte of randomBytes) {
      if (randomByte >= maxAcceptedByte) continue;
      password.push(TEMP_PASSWORD_CHARACTERS[randomByte % TEMP_PASSWORD_CHARACTERS.length]);
      if (password.length === 12) break;
    }
  }

  return password.join("");
}

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Swap Display Dash" }] }),
  beforeLoad: ({ context }) => ({ isOwner: context.isOwner }),
  component: UsuariosRoute,
});

function UsuariosRoute() {
  const { isOwner } = Route.useRouteContext();
  return isOwner ? <Usuarios /> : <AccessRestricted message="Acesso restrito à diretoria." />;
}

function Usuarios() {
  const { user } = Route.useRouteContext();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [passwordDialogEmail, setPasswordDialogEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      const { data, error } = await supabase.rpc("list_users_with_roles");
      if (!active) return;
      if (error) toast.error(error.message);
      else setUsers(data ?? []);
      setLoading(false);
    };

    void loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const changeRole = async (targetUser: UserWithRole, newRole: Enums<"app_role">) => {
    setSavingUserId(targetUser.id);
    const { error } = await supabase.rpc("set_user_role", {
      target_user: targetUser.id,
      new_role: newRole,
    });
    setSavingUserId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((listedUser) =>
        listedUser.id === targetUser.id ? { ...listedUser, role: newRole } : listedUser,
      ),
    );
    toast.success(`Papel atualizado para ${newRole}`);
  };

  const resetPassword = async (targetUser: UserWithRole) => {
    const generatedPassword = generateTemporaryPassword();
    setResettingUserId(targetUser.id);

    try {
      const { error } = await supabase.rpc("reset_user_password", {
        target_user: targetUser.id,
        new_password: generatedPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setTemporaryPassword(generatedPassword);
      setPasswordDialogEmail(targetUser.email);
      setPasswordDialogOpen(true);
      toast.success("Senha redefinida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha");
    } finally {
      setResettingUserId(null);
    }
  };

  const closePasswordDialog = (open: boolean) => {
    setPasswordDialogOpen(open);
    if (!open) {
      setTemporaryPassword(null);
      setPasswordDialogEmail(null);
    }
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success("Senha copiada");
    } catch {
      toast.error("Não foi possível copiar a senha");
    }
  };

  return (
    <TooltipProvider>
    <main className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button asChild variant="ghost"><Link to="/">← Voltar ao monitor</Link></Button>
          <h1 className="text-2xl font-bold">Usuários</h1>
        </div>
        <div className="space-y-3">
          {loading && <p className="text-muted-foreground">Carregando usuários...</p>}
          {!loading && users.length === 0 && <p className="text-muted-foreground">Nenhum usuário encontrado.</p>}
          {users.map((listedUser) => {
            const isCurrentUser = listedUser.id === user.id;
            const isSaving = savingUserId === listedUser.id;
            const isResetting = resettingUserId === listedUser.id;
            const resetDisabled = isCurrentUser || listedUser.is_owner || !listedUser.has_email_provider || isResetting;
            const resetHint = listedUser.is_owner
              ? "A senha da dona não pode ser redefinida por esta tela."
              : isCurrentUser
                ? "Use Minha conta para alterar sua própria senha."
                : !listedUser.has_email_provider
                  ? "Esta conta não tem provedor de e-mail e senha."
                  : "Redefine a senha e gera uma senha temporária.";

            return (
              <Card key={listedUser.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-all">{listedUser.email ?? "E-mail indisponível"}</p>
                  <p className="text-sm text-muted-foreground">
                    Cadastro: {new Date(listedUser.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant={listedUser.role === "admin" ? "default" : "secondary"}>
                  {listedUser.role}
                </Badge>
                <Select
                  value={listedUser.role}
                  onValueChange={(value) => void changeRole(listedUser, value as Enums<"app_role">)}
                  disabled={isCurrentUser || isSaving || isResetting}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="tecnico">tecnico</SelectItem>
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={resetDisabled ? 0 : -1}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void resetPassword(listedUser)}
                        disabled={resetDisabled || isSaving}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {isResetting ? "Redefinindo..." : "Redefinir senha"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{resetHint}</TooltipContent>
                </Tooltip>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
    <Dialog open={passwordDialogOpen} onOpenChange={closePasswordDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Senha temporária</DialogTitle>
          <DialogDescription>
            {passwordDialogEmail ? `Nova senha para ${passwordDialogEmail}. ` : ""}
            Entregue esta senha à pessoa e peça para trocá-la no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="break-all rounded-md border bg-muted p-3 font-mono select-all">
          {temporaryPassword}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void copyTemporaryPassword()}>
            Copiar
          </Button>
          <DialogClose asChild>
            <Button type="button">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}