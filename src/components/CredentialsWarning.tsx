import { AlertTriangle, CheckCircle, ExternalLink, X } from "lucide-react";
import { useCredentialsStatus } from "@/hooks/useMetrics";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function CredentialsWarning() {
  const { status, loading } = useCredentialsStatus();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed) return null;
  if (!status) return null;
  if (status.all_required_configured) return null;

  const missingCount = status.missing_required.length;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm tracking-wider text-amber-500">
              {missingCount} MISSING CREDENTIAL{missingCount > 1 ? 'S' : ''}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Dashboard may show empty data. Configure these credentials:
          </p>

          <div className="space-y-2">
            {/* DockerHub Credentials */}
            {status.credentials.dockerhub && Object.entries(status.credentials.dockerhub).map(([key, cred]) => (
              <CredentialItem 
                key={key}
                name={key}
                configured={cred.configured}
                required={cred.required}
                where={cred.where}
                purpose={cred.purpose}
              />
            ))}

            {/* Jenkins Credentials */}
            {status.credentials.jenkins && Object.entries(status.credentials.jenkins).map(([key, cred]) => (
              <CredentialItem 
                key={key}
                name={key}
                configured={cred.configured}
                required={cred.required}
                where={cred.where}
                purpose={cred.purpose}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3 italic">
            Check: <code className="bg-muted px-1 rounded">curl http://localhost:8000/credentials/status</code>
          </p>
        </div>
      </div>
    </div>
  );
}

interface CredentialItemProps {
  name: string;
  configured: boolean | null;
  required: boolean;
  where: string;
  purpose: string;
}

function CredentialItem({ name, configured, required, where, purpose }: CredentialItemProps) {
  // Skip if configured or can't determine
  if (configured === true) return null;
  if (configured === null && !required) return null;

  return (
    <div className={cn(
      "flex items-start gap-2 p-2 text-xs rounded",
      configured === false && required ? "bg-destructive/10" : "bg-muted/30"
    )}>
      {configured === false ? (
        <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono",
            configured === false && required ? "text-destructive" : "text-foreground"
          )}>
            {name}
          </span>
          {required && (
            <span className="text-[10px] uppercase px-1 bg-destructive/20 text-destructive rounded">
              required
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5">{purpose}</p>
        <p className="text-muted-foreground/70 mt-0.5">📍 {where}</p>
      </div>
    </div>
  );
}
