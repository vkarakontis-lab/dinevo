"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export function SignOutButton({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/dashboard/login");
        })
      }
    >
      {icon}
      <span className={icon ? "sr-only sm:not-sr-only" : undefined}>
        {label}
      </span>
    </Button>
  );
}
