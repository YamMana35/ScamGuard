"use client"

import { useMemo, useState } from "react"
import {
  Mail,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Link2,
  AlertCircle,
  ShieldCheck,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailResult {
  phishingProbability: number
  status: "safe" | "suspicious" | "dangerous"
  suspiciousKeywords: string[]
  extractedLinks: string[]
  reasons: string[]
}

const TRUSTED_DOMAINS = [
  "github.com",
  "google.com",
  "microsoft.com",
  "amazon.com",
  "apple.com",
  "paypal.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "whatsapp.com",
  "telegram.org",
  "openai.com",
  "vercel.com",
]

function normalizeLink(rawLink: string) {
  return rawLink.startsWith("http://") || rawLink.startsWith("https://")
    ? rawLink
    : `https://${rawLink}`
}

function extractDomainFromLink(rawLink: string) {
  try {
    const url = new URL(normalizeLink(rawLink))
    return url.hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return rawLink.toLowerCase()
  }
}

function isTrustedDomain(domain: string) {
  return TRUSTED_DOMAINS.some(
    (trusted) => domain === trusted || domain.endsWith(`.${trusted}`)
  )
}

export function EmailScanner() {
  const [email, setEmail] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<EmailResult | null>(null)

  const extractedDomains = useMemo(() => {
    if (!result?.extractedLinks?.length) return []

    const domains = result.extractedLinks.map(extractDomainFromLink)
    return [...new Set(domains)]
  }, [result])

  const trustedDomainsDetected = useMemo(() => {
    return extractedDomains.filter(isTrustedDomain)
  }, [extractedDomains])

  const unknownDomainsDetected = useMemo(() => {
    return extractedDomains.filter((domain) => !isTrustedDomain(domain))
  }, [extractedDomains])

  const handleScan = async () => {
    if (!email.trim()) return

    setIsScanning(true)
    setResult(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch("https://scamguard-docker.onrender.com/analyze-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: email,
        }),
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          phishingProbability: 0,
          status: "suspicious",
          suspiciousKeywords: [],
          extractedLinks: [],
          reasons: [data?.detail || "Email analysis failed"],
        })
        return
      }

      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
      const links = email.match(urlRegex) || []

      const suspiciousPatterns = [
        "urgent",
        "immediately",
        "verify",
        "suspended",
        "login",
        "password",
        "click here",
        "confirm",
        "payment",
        "refund",
        "invoice",
        "security alert",
        "account suspended",
        "confirm your identity",
        "דחוף",
        "מיידי",
        "אימות",
        "לחץ כאן",
        "לחצי כאן",
        "סיסמה",
        "קוד",
        "תשלום",
        "החשבון ייחסם",
        "עדכן פרטים",
        "החזר",
        "חשבונית",
        "אבטחה",
        "חוב",
        "הוצאה לפועל",
        "רשות המסים",
      ]

      const foundKeywords = suspiciousPatterns.filter((keyword) =>
        email.toLowerCase().includes(keyword.toLowerCase())
      )

      setResult({
        phishingProbability: typeof data.riskScore === "number" ? data.riskScore : 0,
        status:
          data.status === "safe" || data.status === "suspicious" || data.status === "dangerous"
            ? data.status
            : "suspicious",
        suspiciousKeywords: [...new Set(foundKeywords)].slice(0, 8),
        extractedLinks: links.slice(0, 5),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
      })
    } catch (error) {
      console.error("Email scan error:", error)

      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Email analysis timed out"
          : "Could not connect to analysis server"

      setResult({
        phishingProbability: 0,
        status: "suspicious",
        suspiciousKeywords: [],
        extractedLinks: [],
        reasons: [message],
      })
    } finally {
      clearTimeout(timeout)
      setIsScanning(false)
    }
  }

  const getStatusConfig = (status: EmailResult["status"]) => {
    switch (status) {
      case "safe":
        return {
          icon: CheckCircle,
          color: "text-safe",
          bgColor: "bg-safe/10",
          borderColor: "border-safe/30",
          label: "Low Risk",
        }
      case "suspicious":
        return {
          icon: AlertTriangle,
          color: "text-suspicious",
          bgColor: "bg-suspicious/10",
          borderColor: "border-suspicious/30",
          label: "Moderate Risk",
        }
      case "dangerous":
        return {
          icon: XCircle,
          color: "text-dangerous",
          bgColor: "bg-dangerous/10",
          borderColor: "border-dangerous/30",
          label: "High Risk",
        }
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Mail className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-foreground">Email Scanner</CardTitle>
            <CardDescription>
              Analyze email content for phishing attempts and suspicious elements
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          placeholder="Paste the email content here to analyze for phishing attempts..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[180px] bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
        />

        <Button
          onClick={handleScan}
          disabled={isScanning || !email.trim()}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Email...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Analyze Email
            </>
          )}
        </Button>

        {result && (
          <div
            className={`rounded-lg border p-4 ${getStatusConfig(result.status).bgColor} ${getStatusConfig(result.status).borderColor}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = getStatusConfig(result.status)
                  const Icon = config.icon
                  return (
                    <>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                      <span className={`text-lg font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                    </>
                  )
                })()}
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground">Phishing Probability</div>
                <div className={`text-2xl font-bold ${getStatusConfig(result.status).color}`}>
                  {result.phishingProbability}%
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertCircle className="h-4 w-4 text-suspicious" />
                  Suspicious Keywords ({result.suspiciousKeywords.length})
                </div>

                {result.suspiciousKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.suspiciousKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs rounded-full bg-suspicious/20 text-suspicious border border-suspicious/30"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No suspicious keywords found</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-accent" />
                  Extracted Links ({result.extractedLinks.length})
                </div>

                {result.extractedLinks.length > 0 ? (
                  <ul className="space-y-1">
                    {result.extractedLinks.map((link, index) => (
                      <li
                        key={index}
                        className="text-xs text-muted-foreground truncate font-mono bg-secondary/50 px-2 py-1 rounded"
                        title={link}
                      >
                        {link}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No links found in email</p>
                )}
              </div>
            </div>

            {(trustedDomainsDetected.length > 0 || unknownDomainsDetected.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-safe" />
                    Trusted Domains ({trustedDomainsDetected.length})
                  </div>

                  {trustedDomainsDetected.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {trustedDomainsDetected.map((domain, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded-full bg-safe/20 text-safe border border-safe/30"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No trusted domains detected</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Globe className="h-4 w-4 text-suspicious" />
                    Unknown Domains ({unknownDomainsDetected.length})
                  </div>

                  {unknownDomainsDetected.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {unknownDomainsDetected.map((domain, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded-full bg-secondary/70 text-foreground border border-border"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No unknown domains detected</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Backend Analysis Details:</div>
              {result.reasons.length > 0 ? (
                <ul className="space-y-1">
                  {result.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 rounded-full ${getStatusConfig(result.status).color} bg-current flex-shrink-0`}
                      />
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No backend analysis details available</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}