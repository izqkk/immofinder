"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const MOBILE_QUERY = "(max-width: 767px)";

/** True at phone width — Sonner only knows ONE position, so we decide it here. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Top on mobile: the swipe actions (discard/maybe/like) and the tab bar sit at the
      // bottom — a toast down there covers exactly the buttons the user is about to press.
      // At the top it sits below the header and above the image, where nothing is operated.
      // On desktop it stays bottom right, where nothing is in the way.
      position={isMobile ? "top-center" : "bottom-right"}
      duration={2000}
      visibleToasts={1}
      expand={false}
      closeButton={isMobile}
      offset={{ bottom: "16px", right: "16px", left: "16px", top: "16px" }}
      mobileOffset={{
        top: "calc(var(--nav-h) + var(--status-h, 0px) + 8px)",
        left: "12px",
        right: "12px",
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
