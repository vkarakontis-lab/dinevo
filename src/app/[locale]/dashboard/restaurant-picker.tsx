"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectRestaurant } from "./actions";

export function RestaurantPicker({
  memberships,
  activeId,
  label,
}: {
  memberships: { id: string; name: string }[];
  activeId: string;
  label: string;
}) {
  const [, startTransition] = useTransition();

  if (memberships.length <= 1) {
    return (
      <span className="truncate text-sm font-medium">
        {memberships[0]?.name}
      </span>
    );
  }

  return (
    <Select
      value={activeId}
      onValueChange={(id) => startTransition(() => void selectRestaurant(id))}
    >
      <SelectTrigger size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
