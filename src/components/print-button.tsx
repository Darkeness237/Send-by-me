"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" /> {label}
    </Button>
  );
}
