"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WebsiteScanner } from "@/components/scanners/website-scanner"
import { EmailScanner } from "@/components/scanners/email-scanner"
import { MessageScanner } from "@/components/scanners/message-scanner"
import { ImageScanner } from "@/components/scanners/image-scanner"
import { Shield, TrendingUp, Users, Zap } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"website" | "email" | "message" | "image">("website")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header activeTab ={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
            <Shield className="h-4 w-4" />
            <span>AI-Powered Security</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Protect Yourself from <span className="text-primary">Online Threats</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Instantly detect phishing websites, scam emails, suspicious messages, and screenshot-based scams with our advanced security scanner.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-2xl font-bold">99.2%</span>
            </div>
            <p className="text-sm text-muted-foreground">Detection Rate</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-accent mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-2xl font-bold">2M+</span>
            </div>
            <p className="text-sm text-muted-foreground">Threats Blocked</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <Users className="h-5 w-5" />
              <span className="text-2xl font-bold">50K+</span>
            </div>
            <p className="text-sm text-muted-foreground">Users Protected</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-accent mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-2xl font-bold">{"< 2s"}</span>
            </div>
            <p className="text-sm text-muted-foreground">Scan Time</p>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="max-w-3xl mx-auto">
          {activeTab === "website" && <WebsiteScanner />}
          {activeTab === "email" && <EmailScanner />}
          {activeTab === "message" && <MessageScanner />}
          {activeTab === "image" && <ImageScanner />}
        </div>

        {/* Tips Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
            Stay Safe Online
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card/50 border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 font-bold">
                1
              </div>
              <h3 className="font-medium text-foreground mb-1">Check URLs Carefully</h3>
              <p className="text-sm text-muted-foreground">
                Verify domain names and look for HTTPS before entering sensitive info.
              </p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3 font-bold">
                2
              </div>
              <h3 className="font-medium text-foreground mb-1">Beware of Urgency</h3>
              <p className="text-sm text-muted-foreground">
                Scammers create fake urgency to make you act without thinking.
              </p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 font-bold">
                3
              </div>
              <h3 className="font-medium text-foreground mb-1">Never Share Passwords</h3>
              <p className="text-sm text-muted-foreground">
                Legitimate companies will never ask for your password via email or text.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}