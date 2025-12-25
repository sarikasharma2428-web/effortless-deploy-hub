import { Rocket, Menu } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex flex-col items-center">
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
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {["Dashboard", "Pipelines", "Infrastructure", "Logs"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-colors tracking-wide"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button variant="glow" size="sm" className="hidden sm:flex tracking-wider">
              NEW PIPELINE
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
