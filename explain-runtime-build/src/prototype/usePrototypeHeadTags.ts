import { useEffect } from "react";

// Injects the Home Screen / PWA metadata only while the prototype is mounted,
// and removes it on unmount so production pages never pick up the "Companion"
// identity, icon, or service worker.
export function usePrototypeHeadTags(): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Companion";

    const themeColorEl = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = themeColorEl?.getAttribute("content") ?? null;
    themeColorEl?.setAttribute("content", "#0b1b1d");

    const createdTags: HTMLElement[] = [];
    const addMeta = (name: string, content: string) => {
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      el.setAttribute("content", content);
      document.head.appendChild(el);
      createdTags.push(el);
    };
    const addLink = (rel: string, href: string) => {
      const el = document.createElement("link");
      el.setAttribute("rel", rel);
      el.setAttribute("href", href);
      document.head.appendChild(el);
      createdTags.push(el);
    };

    addLink("manifest", "/companion/manifest.webmanifest");
    addLink("apple-touch-icon", "/companion/icon-180.png");
    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    addMeta("apple-mobile-web-app-title", "Companion");
    addMeta("mobile-web-app-capable", "yes");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/companion/sw.js", { scope: "/companion/" }).catch(() => {
        // Installability proof only; safe to ignore where unsupported (e.g. plain HTTP dev).
      });
    }

    return () => {
      document.title = previousTitle;
      if (themeColorEl && previousThemeColor !== null) themeColorEl.setAttribute("content", previousThemeColor);
      createdTags.forEach((el) => el.remove());
    };
  }, []);
}
