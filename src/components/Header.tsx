import { Rocket, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Pipelines", href: "/pipelines" },
  { label: "Infrastructure", href: "/#infrastructure" },
  { label: "Logs", href: "/#logs" },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gold text-xs">◆◆◆</span>
            </div>
            <h1 className="font-display text-2xl tracking-[0.2em] text-foreground">
              AUTO<span className="text-primary">DEPLOY</span>X
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-8 h-px bg-gold/50" />
              <span className="text-[10px] text-gold tracking-[0.3em] uppercase">DevOps Platform</span>
              <span className="w-8 h-px bg-gold/50" />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = item.href === "/" 
                ? location.pathname === "/" 
                : location.pathname.startsWith(item.href.split('#')[0]) && item.href !== "/";
              
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "text-sm transition-colors tracking-wide",
                    isActive 
                      ? "text-primary font-medium" 
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link to="/pipelines">
              <Button variant="glow" size="sm" className="hidden sm:flex tracking-wider">
                NEW PIPELINE
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
