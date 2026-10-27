import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Img } from "@/content/landing";

/**
 * Image filling a positioned container (`next/image` with `fill` +
 * object-cover). The container's size and radius come from `className`.
 */
export function Photo({
  img,
  sizes,
  className,
  priority,
  children,
}: {
  img: Img;
  sizes: string;
  className?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-banda-salvia", className)}>
      <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      {children}
    </div>
  );
}
