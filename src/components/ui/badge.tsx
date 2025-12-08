import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-[0_0_10px_hsl(174_72%_50%/0.4)]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-primary/30 hover:border-primary/50 hover:bg-primary/5",
        aurora: "border-transparent gradient-aurora text-white shadow-[0_0_10px_hsl(174_72%_50%/0.3)] hover:shadow-[0_0_15px_hsl(174_72%_50%/0.5)]",
        auroraOutline: "border-primary/40 bg-transparent text-primary hover:bg-primary/10 hover:shadow-[0_0_10px_hsl(174_72%_50%/0.3)]",
        success: "border-transparent bg-accent text-accent-foreground hover:bg-accent/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
