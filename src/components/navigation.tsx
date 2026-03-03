"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  PackageIcon,
  ClockCounterClockwiseIcon,
  ListPlusIcon,
  ListIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Інвентар", icon: PackageIcon },
  { href: "/skus", label: "Керування SKU", icon: ListPlusIcon },
  { href: "/history", label: "Історія", icon: ClockCounterClockwiseIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="border-b border-border bg-background hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center gap-6">
            <Link href="/" className="text-sm font-semibold">
              Inventorizer
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="border-b border-border bg-background md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold">
            Inventorizer
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <ListIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Меню</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4 px-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-2")}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
