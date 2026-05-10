import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 font-mono-ui tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-ink/90 paper-shadow",
        destructive:
          "bg-[#B5422C] text-paper hover:bg-[#B5422C]/90",
        outline:
          "border-2 border-ink/20 bg-transparent hover:bg-paper-dark hover:border-ink/30 text-ink",
        secondary:
          "bg-paper-dark text-ink hover:bg-parchment border border-parchment",
        ghost:
          "hover:bg-paper-dark hover:text-ink",
        link: "text-terracotta underline-offset-4 hover:underline",
        terracotta: "bg-terracotta text-paper hover:bg-terracotta/90 paper-shadow",
        stamp: "border-2 border-terracotta text-terracotta bg-transparent hover:bg-terracotta/10 rotate-[-1deg]",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 text-xs px-3 has-[>svg]:px-2.5",
        lg: "h-12 px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
