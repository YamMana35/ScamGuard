"use client"

import { useRef, useState } from "react"
import { ImageIcon, Upload, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ImageScanResult {
  extractedText: string
  mode: "email" | "message"
  riskScore: number
  status: "safe" | "suspicious" | "dangerous"
  reasons: string[]
}

export function ImageScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<"email" | "message">("message")
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ImageScanResult | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleScan = async () => {
    if (!file) return

    setIsScanning(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mode", mode)

      const response = await fetch("https://scamguard-docker.onrender.com/analyze-image", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      console.log("Image backend response:", data)

      if (!response.ok) {
        setResult({
          extractedText: "",
          mode,
          riskScore: 0,
          status: "suspicious",
          reasons: [data.detail || "Image analysis failed"],
        })
        return
      }

      setResult({
        extractedText: data.extractedText || "",
        mode: data.mode || mode,
        riskScore: data.riskScore || 0,
        status: data.status || "suspicious",
        reasons: Array.isArray(data.reasons) ? data.reasons : ["No analysis details available"],
      })
    } catch (error) {
      console.error("Image scan error:", error)

      setResult({
        extractedText: "",
        mode,
        riskScore: 0,
        status: "suspicious",
        reasons: ["Could not connect to image analysis server"],
      })
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusConfig = (status: ImageScanResult["status"]) => {
    switch (status) {
      case "safe":
        return {
          icon: CheckCircle,
          color: "text-safe",
          bgColor: "bg-safe/10",
          borderColor: "border-safe/30",
          label: "Safe",
        }
      case "suspicious":
        return {
          icon: AlertTriangle,
          color: "text-suspicious",
          bgColor: "bg-suspicious/10",
          borderColor: "border-suspicious/30",
          label: "Suspicious",
        }
      case "dangerous":
        return {
          icon: XCircle,
          color: "text-dangerous",
          bgColor: "bg-dangerous/10",
          borderColor: "border-dangerous/30",
          label: "Dangerous",
        }
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">Screenshot Scanner</CardTitle>
            <CardDescription>
              Upload a screenshot of an email or message and analyze it for phishing
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {file ? "Change Screenshot" : "Choose Screenshot"}
          </Button>

          <div className="text-sm text-muted-foreground">
            {file ? `Selected file: ${file.name}` : "No file selected"}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "message" ? "default" : "outline"}
              onClick={() => setMode("message")}
            >
              Message
            </Button>

            <Button
              type="button"
              variant={mode === "email" ? "default" : "outline"}
              onClick={() => setMode("email")}
            >
              Email
            </Button>
          </div>

          <Button
            onClick={handleScan}
            disabled={isScanning || !file}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning Screenshot...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Analyze Screenshot
              </>
            )}
          </Button>
        </div>

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
                <div className="text-sm text-muted-foreground">Risk Score</div>
                <div className={`text-2xl font-bold ${getStatusConfig(result.status).color}`}>
                  {result.riskScore}%
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-foreground mb-2">Detected Indicators:</div>
              <div className="flex flex-wrap gap-2">
                {result.reasons.map((reason, index) => (
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
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-foreground mb-2">Extracted Text:</div>
              <div className="rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {result.extractedText || "No text detected"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}