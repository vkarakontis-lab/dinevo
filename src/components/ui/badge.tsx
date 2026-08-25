import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// One badge per meaning (DESIGN.md §1): `mint` = available/open, `sun` = featured
// or rated, `sea` = place, `grape`/`pink` = category variety, `coral` = brand.
// Soft variants are tinted fills for dense UI; solid ones are for emphasis.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/45 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-coral text-coral-foreground [a&]:hover:bg-coral/90",
        brand: "bg-gradient-brand text-white",
        soft: "bg-coral-soft text-coral dark:bg-coral/15",
        sea: "bg-sea-soft text-sea dark:bg-sea/15",
        mint: "bg-mint-soft text-mint dark:bg-mint/15",
        sun: "bg-sun-soft text-[#7a5200] dark:bg-sun/15 dark:text-sun",
        grape: "bg-grape-soft text-grape dark:bg-grape/15",
        pink: "bg-pink-soft text-pink dark:bg-pink/15",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive: "bg-destructive text-white focus-visible:ring-destructive/25",
        outline:
          "border-border bg-card/70 text-foreground [a&]:hover:border-coral/40 [a&]:hover:text-coral",
        ghost: "[a&]:hover:bg-muted",
        link: "text-coral underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
