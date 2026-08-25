import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Dinevo buttons are pills: bigger touch targets, coloured glow on the actions
// that matter, hairline outlines everywhere else. See DESIGN.md §1 and §4.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The primary action anywhere on the site.
        default:
          "bg-coral text-coral-foreground shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--coral)_75%,transparent)] hover:bg-coral/90 hover:shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--coral)_85%,transparent)]",
        // Hero / conversion moments only — one per viewport.
        brand:
          "bg-gradient-brand text-white glow-brand hover:brightness-108 hover:saturate-110",
        sea: "bg-sea text-sea-foreground hover:bg-sea/90 glow-sea",
        mint: "bg-mint text-mint-foreground hover:bg-mint/90 glow-mint",
        sun: "bg-sun text-sun-foreground hover:bg-sun/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-border bg-card text-foreground shadow-soft hover:border-coral/45 hover:bg-coral-soft hover:text-coral dark:hover:bg-coral/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        // Tinted fill — sits on white without shouting.
        soft: "bg-coral-soft text-coral hover:bg-coral/15 dark:bg-coral/12 dark:text-coral",
        ghost: "text-foreground hover:bg-muted",
        link: "rounded-none text-coral underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-7 text-base has-[>svg]:px-6",
        xl: "h-14 px-8 text-base has-[>svg]:px-7",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
