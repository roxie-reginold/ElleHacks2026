"use client"

import { Home, BarChart3, Mic2, LifeBuoy } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "home", label: "Today", icon: Home },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "courage", label: "Voice", icon: Mic2 },
  { id: "help", label: "Support", icon: LifeBuoy },
]

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-card" />
      </nav>

      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-20 flex-col items-center border-r border-border bg-card py-6 gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
          <span className="text-xl font-bold text-primary">C</span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
