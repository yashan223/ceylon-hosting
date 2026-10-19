"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/files", label: "Files & Storage" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map((link) => {
        const isActive =
          link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link className={isActive ? "active" : undefined} href={link.href} key={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
