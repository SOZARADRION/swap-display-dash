import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Request = {
  id: string;
  client_name: string;
  client_type: "PF" | "PJ";
  contract_manager: string;
  contract_number: string;
  equipment: string;
  status: "pendente" | "em_andamento" | "concluido";
  request_type: "troca" | "aluguel";
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/gerenciar")({
  head: () => ({ meta: [{ title: "Gerenciar Pedidos" }] }),
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") throw redirect({ to: "/" });
  },
  component: Gerenciar,
});

function Gerenciar() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Request[]>([]);

  const load = async () => {
    const { data } = await supabase.from("equipment_requests").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Request[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("equipment_requests_manage")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: Request["status"]) => {
    const { error } = await supabase.from("equipment_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Status atualizado");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;
    const { error } = await supabase.from("equipment_requests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Pedido excluído");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="ghost"><Link to="/">← Monitor</Link></Button>
            <Button asChild variant="ghost"><Link to="/historico">Histórico</Link></Button>
            <Button asChild><Link to="/novo">+ Novo</Link></Button>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>Sair</Button>
        </div>
        <h1 className="text-2xl font-bold mb-4">Gerenciar pedidos</h1>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-muted-foreground">Nenhum pedido registrado.</p>}
          {items.map((r) => (
            <Card key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold flex-wrap">
                  {r.client_name}
                  <Badge variant="outline">{r.client_type}</Badge>
                  <Badge variant={r.request_type === "aluguel" ? "default" : "secondary"}>
                    {r.request_type === "aluguel" ? "Aluguel" : "Troca"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.equipment} • Contrato #{r.contract_number} • {r.contract_manager}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Request["status"])}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
