"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

type Tab = {
  href: string;
  label: string;
};

const tabs: Tab[] = [
  { href: "/", label: "Chat" },
  { href: "/image", label: "Image" },
];

export default function TabsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center">
      <div className="flex items-center rounded-xl border border-[var(--brand-200)] bg-[color:rgba(184,227,233,0.55)] p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,130,0.35)]",
                isActive
                  ? "bg-white text-[var(--brand-900)] shadow-sm"
                  : "text-[color:rgba(11,46,51,0.7)] hover:bg-white/70 hover:text-[var(--brand-900)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
