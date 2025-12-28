import { useEffect, useState } from "react";

export function useThemeWatcher() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.body.classList.contains("dark") ||
        document.body.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark =
        document.body.classList.contains("dark") ||
        document.body.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "dark" : "light");
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
