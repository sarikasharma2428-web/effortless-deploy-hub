import { MapPin, Phone, Clock } from "lucide-react";

export function ContactBar() {
  const items = [
    {
      icon: MapPin,
      label: "Location",
      value: "Local Minikube Cluster",
      subtext: "Development Environment",
    },
    {
      icon: Phone,
      label: "Support",
      value: "docs.autodeployx.io",
      subtext: "Documentation",
    },
    {
      icon: Clock,
      label: "Pipeline Hours",
      value: "24/7 Automated",
      subtext: "Always Running",
    },
  ];

  return (
    <div className="bg-card border-y border-border/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-4 py-6 px-4 justify-center">
              <item.icon className="w-5 h-5 text-primary" />
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-0.5">
                  {item.label}
                </p>
                <p className="text-foreground font-medium">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.subtext}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
