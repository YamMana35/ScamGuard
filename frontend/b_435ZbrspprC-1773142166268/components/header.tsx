"use client"

import { Shield, Globe, Mail, MessageSquare, ImageIcon } from "lucide-react"

interface HeaderProps {
  activeTab: "website" | "email" | "message" | "image"
  onTabChange: (tab: "website" | "email" | "message" | "image") => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const tabs = [
    { id: "website" as const, label: "Website Scan", icon: Globe },
    { id: "email" as const, label: "Email Scan", icon: Mail },
    { id: "message" as const, label: "Message Scan", icon: MessageSquare },
    { id: "image" as const, label: "Screenshot Scan", icon: ImageIcon },
  ]

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-md bg-primary/30 -z-10" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Scam<span className="text-primary">Guard</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="md:hidden flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-label={tab.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}