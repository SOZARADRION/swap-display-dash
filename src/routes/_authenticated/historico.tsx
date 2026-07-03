import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AuditRow = {
  id: string;
  request_id: string;
  action: "status_change" | "delete";
  old_status: string | null;
  new_status: string | null;
  snapshot: { client_name?: string; equipment?: string; contract_number?: string } | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico de Alterações" }] }),
  component: Historico,
});

function Historico() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("equipment_request_audit" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("equipment_request_audit_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "equipment_request_audit" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="ghost"><Link to="/">← Monitor</Link></Button>
            <Button asChild variant="ghost"><Link to="/gerenciar">Gerenciar</Link></Button>
            <Button asChild><Link to="/novo">+ Novo</Link></Button>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>Sair</Button>
        </div>
        <h1 className="text-2xl font-bold mb-1">Histórico de alterações</h1>
        <p className="text-sm text-muted-foreground mb-4">Auditoria de mudanças de status e exclusões de pedidos.</p>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Alteração</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro ainda.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {r.action === "delete" ? (
                      <Badge variant="destructive">Exclusão</Badge>
                    ) : (
                      <Badge variant="secondary">Status</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r.snapshot?.client_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.snapshot?.equipment} {r.snapshot?.contract_number && `• #${r.snapshot.contract_number}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.action === "status_change" ? (
                      <span>
                        <Badge variant="outline">{STATUS_LABEL[r.old_status ?? ""] ?? r.old_status}</Badge>
                        <span className="mx-2">→</span>
                        <Badge>{STATUS_LABEL[r.new_status ?? ""] ?? r.new_status}</Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pedido removido</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.actor_email ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
