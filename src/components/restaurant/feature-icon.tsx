import { icons, Dot, type LucideIcon } from "lucide-react";

// Config stores lucide icon names in kebab/lower case ("sea-view" → "waves").
const toPascal = (name: string) =>
  name
    .split(/[-_ ]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

export function featureIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Dot;
  return (icons as Record<string, LucideIcon>)[toPascal(name)] ?? Dot;
}
