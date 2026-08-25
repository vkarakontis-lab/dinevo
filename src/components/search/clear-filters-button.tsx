"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Drops every filter by navigating to the bare pathname. Lives in the empty
 * state, where the filters themselves have scrolled out of reach.
 */
export function ClearFiltersButton({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() => router.replace(pathname, { scroll: false }))
      }
    >
      <X data-icon="inline-start" />
      {label}
    </Button>
  );
}
