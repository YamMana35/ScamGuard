"use client"

import { useState } from "react"
import { Mail, Search, AlertTriangle, CheckCircle, XCircle, Loader2, Link2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailResult {
    phishingProbability: number
    status: "safe" | "suspicious" | "dangerous"
    suspiciousKeywords: string[]
    extractedLinks: string[]
}

export function EmailScanner() {
    const [email, setEmail] = useState("")
    const [isScanning, setIsScanning] = useState(false)
    const [result, setResult] = useState<EmailResult | null>(null)

    const handleScan = async () => {
        if (!email.trim()) return

        setIsScanning(true)
        setResult(null)

        try {
            const response = await fetch("https://scamguard-docker.onrender.com/analyze-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: email,
                }),
            })

            const data = await response.json()

            const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
            const links = email.match(urlRegex) || []

            const suspiciousPatterns = [
                "urgent", "immediately", "verify", "suspended", "login",
                "password", "click here", "confirm", "account", "payment",
                "דחוף", "מיידי", "אימות", "אמת", "החשבון", "לחץ כאן",
                "לחצי כאן", "סיסמה", "קוד", "תשלום", "החשבון ייחסם",
                "החבילה", "נכשל", "אשראי", "עדכן פרטים"
            ]

            const foundKeywords = suspiciousPatterns.filter((keyword) =>
                email.toLowerCase().includes(keyword.toLowerCase())
            )

            setResult({
                phishingProbability: data.riskScore,
                status: data.status,
                suspiciousKeywords: foundKeywords.slice(0, 8),
                extractedLinks: links.slice(0, 5),
            })
        } catch (error) {
            console.error("Email scan error:", error)

            setResult({
                phishingProbability: 0,
                status: "suspicious",
                suspiciousKeywords: [],
                extractedLinks: [],
            })
        }

        setIsScanning(false)
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
                                <div className="text-sm text-muted-foreground">Phishing Probability</div>
                                <div className={`text-2xl font-bold ${getStatusConfig(result.status).color}`}>
                                    {result.phishingProbability}%
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
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
                    </div>
                )}
            </CardContent>
        </Card>
    )
}