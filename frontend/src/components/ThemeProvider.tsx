"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { usePathname } from "next/navigation";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();

  const isAdmin = pathname?.startsWith("/admin");
  const storageKey = isAdmin ? "provaluer-admin-theme" : "provaluer-theme";
  const defaultTheme = isAdmin ? "light" : props.defaultTheme || "dark";

  return (
    <NextThemesProvider 
      {...props} 
      key={storageKey} 
      storageKey={storageKey} 
      defaultTheme={defaultTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
