"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHelpStore } from "@/lib/hooks/use-help-store";

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const toggleHelp = useHelpStore((s) => s.toggleHelp);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTextField(event.target)
      )
        return;

      if (event.key === "?") {
        event.preventDefault();
        toggleHelp();
      } else if (event.key === "/") {
        event.preventDefault();
        router.push("/dashboard/shipments?focus=search");
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/dashboard/shipments/create");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleHelp]);

  return (
    <span className="no-print sr-only" aria-live="polite">
      Keyboard shortcuts available
    </span>
  );
}
