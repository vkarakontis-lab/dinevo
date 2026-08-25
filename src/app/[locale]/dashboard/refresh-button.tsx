"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      onClick={() => startTransition(() => router.refresh())}
      disabled={busy}
    >
      <RefreshCw
        data-icon="inline-start"
        className={busy ? "animate-spin" : undefined}
      />
      {label}
    </Button>
  );
}
