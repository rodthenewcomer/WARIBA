"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches("input, textarea, select")) return;
      if (!event.shiftKey || event.key.toLowerCase() !== "d") return;
      event.preventDefault();
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    const color = resolvedTheme === "dark" ? "#000000" : "#f7f8fa";
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = color;
    });
  }, [resolvedTheme]);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 sm:h-9 sm:w-9" aria-label="Thème" />;
  }
  const dark = resolvedTheme === "dark";
  const label = dark ? "Passer en mode clair" : "Passer en mode sombre";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="group h-11 w-11 shrink-0 sm:h-9 sm:w-9"
      aria-label={label}
      aria-keyshortcuts="Shift+D"
      title={`${label} · Maj D`}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="transition-transform duration-200 motion-safe:group-active:scale-90">
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </Button>
  );
}
