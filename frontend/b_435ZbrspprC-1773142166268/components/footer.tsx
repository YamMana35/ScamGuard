import { Shield, Lock, Eye } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Advanced Detection</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis to identify phishing attempts and scam patterns.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Privacy First</h4>
              <p className="text-sm text-muted-foreground">
                Your data is never stored. All scans are processed securely and anonymously.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Real-time Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Instant results with detailed breakdowns of potential threats.
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              Scam<span className="text-primary">Guard</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            A cybersecurity tool for detecting and preventing online scams, phishing, and fraud.
          </p>
        </div>
      </div>
    </footer>
  )
}
