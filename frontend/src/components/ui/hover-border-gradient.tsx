"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient<T extends React.ElementType = "button">({
  children,
  containerClassName,
  className,
  maskClassName,
  as,
  duration = 1.2,
  clockwise = true,
  ...props
}: {
  as?: T;
  containerClassName?: string;
  className?: string;
  maskClassName?: string;
  duration?: number;
  clockwise?: boolean;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>) {
  const Tag = as || "button";
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  // Brand Color Palette with Lighter Shade of Yellow (#FDE047, #FEF08A) & Royal Electric Blue (#0053FF, #38bdf8)
  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(40% 70% at 50% 0%, #FDE047 0%, #0053FF 45%, rgba(0, 83, 255, 0) 100%)",
    LEFT: "radial-gradient(35% 65% at 0% 50%, #0053FF 0%, #FEF08A 45%, rgba(254, 240, 138, 0) 100%)",
    BOTTOM:
      "radial-gradient(40% 70% at 50% 100%, #FDE047 0%, #0053FF 45%, rgba(0, 83, 255, 0) 100%)",
    RIGHT:
      "radial-gradient(35% 65% at 100% 50%, #0053FF 0%, #FEF08A 45%, rgba(254, 240, 138, 0) 100%)",
  };

  const highlight =
    "radial-gradient(95% 190% at 50% 50%, #FDE047 0%, #0053FF 50%, rgba(0, 83, 255, 0) 100%)";

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration, clockwise]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative inline-flex items-center justify-center p-[2px] rounded-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer w-fit decoration-clone",
        containerClassName
      )}
      {...props}
    >
      {/* Inner Button Face */}
      <div
        className={cn(
          "relative z-[2] w-full h-full font-bold px-6 py-3 rounded-[inherit] transition-all flex items-center justify-center gap-2",
          className
        )}
      >
        {children}
      </div>

      {/* Animated Glowing Gradient Border with Light-Yellow & Blue Rotation */}
      <motion.div
        className="absolute inset-0 z-0 rounded-[inherit] overflow-hidden pointer-events-none"
        style={{
          filter: "blur(2.5px)",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1.2 }}
      />

      {/* Solid Base Mask */}
      <div
        className={cn(
          "absolute inset-[1.5px] z-[1] rounded-[inherit] pointer-events-none",
          maskClassName || "bg-[#0053FF]"
        )}
      />
    </Tag>
  );
}
