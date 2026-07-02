import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  client_name: z.string().trim().min(1).max(120),
  client_type: z.enum(["PF", "PJ"]),
  contract_manager: z.string().trim().min(1).max(120),
  contract_number: z.string().trim().min(1).max(60),
  equipment: z.string().trim().min(1).max(200),
});

export const Route = createFileRoute("/_authenticated/novo")({
  head: () => ({ meta: [{ title: "Novo Pedido — Troca de Equipamentos" }] }),
  component: NovoPedido,
});

function NovoPedido() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_type: "PJ" as "PF" | "PJ",
    contract_manager: "",
    contract_number: "",
    equipment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("equipment_requests").insert({
      ...parsed.data,
      created_by: userData.user!.id,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pedido registrado!");
    navigate({ to: "/" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <Button asChild variant="ghost"><Link to="/">← Monitor</Link></Button>
          <Button variant="ghost" onClick={handleSignOut}>Sair</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Novo pedido de troca</CardTitle>
            <CardDescription>Preencha os dados do equipamento a ser trocado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="client_name">Nome do cliente</Label>
                <Input id="client_name" required maxLength={120} value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <RadioGroup
                  value={form.client_type}
                  onValueChange={(v) => setForm({ ...form, client_type: v as "PF" | "PJ" })}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PF" id="pf" /><Label htmlFor="pf">Pessoa Física</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PJ" id="pj" /><Label htmlFor="pj">Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="contract_manager">Gerente do contrato</Label>
                <Input id="contract_manager" required maxLength={120} value={form.contract_manager}
                  onChange={(e) => setForm({ ...form, contract_manager: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contract_number">Número do contrato</Label>
                <Input id="contract_number" required maxLength={60} value={form.contract_number}
                  onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="equipment">Equipamento</Label>
                <Input id="equipment" required maxLength={200} value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Registrar pedido"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
