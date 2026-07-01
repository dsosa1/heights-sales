import Link from "next/link";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/skus", label: "Sales by SKU" },
  { href: "/customers", label: "Sales by Customer" },
  { href: "/reps", label: "Sales by Rep" },
  { href: "/sync", label: "Sync" },
];

export function Nav() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
        <span className="text-sm font-semibold tracking-tight">Heights Sales</span>
        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
