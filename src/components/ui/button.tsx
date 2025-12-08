import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-soft active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "gradient-primary text-primary-foreground hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
        hero: "gradient-primary text-primary-foreground shadow-soft hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] font-display font-bold text-base",
        // Aurora themed variants
        aurora: "gradient-aurora text-white shadow-glow hover:shadow-[0_0_30px_hsl(174_72%_50%/0.5),0_0_60px_hsl(270_60%_55%/0.3)] hover:scale-[1.03] active:scale-[0.98]",
        auroraOutline: "border-2 border-primary bg-transparent text-primary hover:bg-primary/10 hover:shadow-[0_0_20px_hsl(174_72%_50%/0.4)] hover:border-accent active:scale-[0.98]",
        auroraGhost: "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-[0_0_15px_hsl(174_72%_50%/0.3)] active:scale-[0.98]",
        auroraSoft: "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground border border-primary/30 hover:from-primary/30 hover:to-accent/30 hover:shadow-[0_0_20px_hsl(174_72%_50%/0.25)] active:scale-[0.98]",
        auroraHero: "gradient-aurora text-white shadow-[0_0_25px_hsl(174_72%_50%/0.4),0_0_50px_hsl(270_60%_55%/0.2)] hover:shadow-[0_0_35px_hsl(174_72%_50%/0.6),0_0_70px_hsl(270_60%_55%/0.4)] hover:scale-[1.03] active:scale-[0.98] font-display font-bold",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-14 rounded-2xl px-10 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
