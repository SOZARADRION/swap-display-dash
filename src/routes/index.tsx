import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Wrench, CheckCircle2, Building2, User, Volume2, VolumeX } from "lucide-react";

type Request = {
  id: string;
  client_name: string;
  client_type: "PF" | "PJ";
  contract_manager: string;
  contract_number: string;
  equipment: string;
  status: "pendente" | "em_andamento" | "concluido";
  created_at: string;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monitor de Pedidos de Troca de Equipamentos" },
      { name: "description", content: "Acompanhe em tempo real os pedidos de troca de equipamentos da empresa." },
      { property: "og:title", content: "Monitor de Pedidos de Troca" },
      { property: "og:description", content: "Kanban em tempo real dos pedidos de troca de equipamentos." },
    ],
  }),
  component: Monitor,
});

const COLUMNS = [
  { key: "pendente", label: "Pendente", icon: Clock, color: "text-amber-500" },
  { key: "em_andamento", label: "Em andamento", icon: Wrench, color: "text-blue-500" },
  { key: "concluido", label: "Concluído", icon: CheckCircle2, color: "text-emerald-500" },
] as const;

function Monitor() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [authed, setAuthed] = useState(false);

  const [soundOn, setSoundOn] = useState(true);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [880, 1175]; // A5, D6 - "ding"
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        const start = now + i * 0.12;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.25, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(start);
        o.stop(start + 0.4);
      });
      setTimeout(() => ctx.close(), 900);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let firstLoad = true;
    const knownIds = new Set<string>();
    const load = async () => {
      const { data } = await supabase
        .from("equipment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (mounted && data) {
        const rows = data as Request[];
        if (!firstLoad && soundOn) {
          const hasNew = rows.some((r) => !knownIds.has(r.id));
          if (hasNew) playBeep();
        }
        knownIds.clear();
        rows.forEach((r) => knownIds.add(r.id));
        firstLoad = false;
        setRequests(rows);
      }
    };
    load();

    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));

    const channel = supabase
      .channel("equipment_requests_monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_requests" },
        () => load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
    };
  }, [soundOn]);


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1800px] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos de Troca de Equipamentos</h1>
            <p className="text-sm text-muted-foreground">Monitor em tempo real</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSoundOn((v) => {
                  const next = !v;
                  if (next) playBeep();
                  return next;
                });
              }}
              title={soundOn ? "Som ligado" : "Som desligado"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {authed ? (
              <>
                <Button asChild variant="outline"><Link to="/novo">Novo pedido</Link></Button>
                <Button asChild variant="ghost"><Link to="/gerenciar">Gerenciar</Link></Button>
                <Button asChild variant="ghost"><Link to="/historico">Histórico</Link></Button>
              </>
            ) : (
              <Button asChild><Link to="/auth">Entrar</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const items = requests.filter((r) => r.status === col.key);
            const Icon = col.icon;
            return (
              <section key={col.key} className="flex flex-col rounded-xl bg-muted/40 p-4 min-h-[70vh]">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-5 w-5 ${col.color}`} />
                  <h2 className="text-lg font-semibold">{col.label}</h2>
                  <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">Sem pedidos</div>
                  )}
                  {items.map((r) => (
                    <article key={r.id} className="rounded-lg bg-card border p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-semibold">
                          {r.client_type === "PJ" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          {r.client_name}
                        </div>
                        <Badge variant="outline">{r.client_type}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><span className="text-muted-foreground">Equipamento: </span>{r.equipment}</div>
                        <div><span className="text-muted-foreground">Contrato: </span>#{r.contract_number}</div>
                        <div><span className="text-muted-foreground">Gerente: </span>{r.contract_manager}</div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
