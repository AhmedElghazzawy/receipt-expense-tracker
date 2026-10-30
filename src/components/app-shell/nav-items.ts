import { ChartPie, House, ReceiptText, Settings } from "lucide-react";

export const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/insights", label: "Insights", icon: ChartPie },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
