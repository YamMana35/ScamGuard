"use client"

import { useState } from "react"
import { Globe, Search, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ScanResult {
    riskScore: number
    status: "safe" | "suspicious" | "dangerous"
    reasons: string[]
}

export function WebsiteScanner() {
    const [url, setUrl] = useState("")
    const [isScanning, setIsScanning] = useState(false)
    const [result, setResult] = useState<ScanResult | null>(null)

    const handleScan = async () => {
        if (!url.trim()) return

        setIsScanning(true)
        setResult(null)

        try {
            const response = await fetch("http://127.0.0.1:8000/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: url,
                }),
            })

            const data = await response.json()

            const scanResult: ScanResult = {
                riskScore: data.riskScore,
                status: data.status,
                reasons: data.reasons,
            }

            setResult(scanResult)
        } catch (error) {
            console.error("Scan error:", error)

            setResult({
                riskScore: 0,
                status: "suspicious",
                reasons: ["Could not connect to analysis server"],
            })
        }

        setIsScanning(false)
    }

    const getStatusConfig = (status: ScanResult["status"]) => {
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
                        <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-foreground">Website Scanner</CardTitle>
                        <CardDescription>
                            Check if a website URL is safe or potentially malicious
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-3">
                    <Input
                        type="url"
                        placeholder="Enter website URL (e.g., https://example.com)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                        onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    />
                    <Button
                        onClick={handleScan}
                        disabled={isScanning || !url.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px]"
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Scan Website
                            </>
                        )}
                    </Button>
                </div>

                {result && (
                    <div className={`rounded-lg border p-4 ${getStatusConfig(result.status).bgColor} ${getStatusConfig(result.status).borderColor}`}>
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

                        <div className="space-y-2">
                            <div className="text-sm font-medium text-foreground">Analysis Details:</div>
                            <ul className="space-y-1">
                                {result.reasons.map((reason, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${getStatusConfig(result.status).color} bg-current flex-shrink-0`} />
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}