import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccessRestricted({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className={action ? "flex gap-2" : undefined}>
          <Button asChild>
            <Link to="/">Voltar ao monitor</Link>
          </Button>
          {action}
        </CardContent>
      </Card>
    </main>
  );
}