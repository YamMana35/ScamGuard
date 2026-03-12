"use client"

import { useState } from "react"
import { MessageSquare, Search, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MessageResult {
  scamLikelihood: number
  status: "safe" | "suspicious" | "dangerous"
  indicators: string[]
}

export function MessageScanner() {
  const [message, setMessage] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<MessageResult | null>(null)

  const handleScan = async () => {
    if (!message.trim()) return

    setIsScanning(true)
    setResult(null)

    try {
      const response = await fetch("https://scamguard-ikr1.onrender.com/analyze-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
        }),
      })

      const data = await response.json()
      console.log("Backend response:", data)

      setResult({
        scamLikelihood: data.riskScore,
        status: data.status,
        indicators:
          Array.isArray(data.reasons) && data.reasons.length > 0
            ? data.reasons
            : ["No suspicious patterns detected"],
      })
    } catch (error) {
      console.error("Message scan error:", error)

      setResult({
        scamLikelihood: 0,
        status: "suspicious",
        indicators: ["Could not connect to analysis server"],
      })
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusConfig = (status: MessageResult["status"]) => {
    switch (status) {
      case "safe":
        return {
          icon: CheckCircle,
          color: "text-safe",
          bgColor: "bg-safe/10",
          borderColor: "border-safe/30",
          label: "Likely Safe",
          description: "This message appears to be legitimate.",
        }
      case "suspicious":
        return {
          icon: AlertTriangle,
          color: "text-suspicious",
          bgColor: "bg-suspicious/10",
          borderColor: "border-suspicious/30",
          label: "Potentially Suspicious",
          description: "Exercise caution with this message.",
        }
      case "dangerous":
        return {
          icon: XCircle,
          color: "text-dangerous",
          bgColor: "bg-dangerous/10",
          borderColor: "border-dangerous/30",
          label: "Likely Scam",
          description: "This message shows strong signs of being a scam.",
        }
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">Message Scanner</CardTitle>
            <CardDescription>
              Check SMS, WhatsApp, or Telegram messages for scam indicators
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Paste suspicious message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />

          <Button
            onClick={handleScan}
            disabled={isScanning || !message.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning Message...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan Message
              </>
            )}
          </Button>
        </div>

        {result && (
          <div
            className={`rounded-lg border p-4 ${getStatusConfig(result.status).bgColor} ${getStatusConfig(result.status).borderColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = getStatusConfig(result.status)
                  const Icon = config.icon

                  return (
                    <>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                      <div>
                        <span className={`text-lg font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground">Scam Likelihood</div>
                <div className={`text-2xl font-bold ${getStatusConfig(result.status).color}`}>
                  {result.scamLikelihood}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Detected Indicators:</div>
              <div className="flex flex-wrap gap-2">
                {result.indicators.map((indicator, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      result.status === "safe"
                        ? "bg-safe/20 text-safe border border-safe/30"
                        : result.status === "suspicious"
                        ? "bg-suspicious/20 text-suspicious border border-suspicious/30"
                        : "bg-dangerous/20 text-dangerous border border-dangerous/30"
                    }`}
                  >
                    {indicator}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}