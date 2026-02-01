"use client"

import { Home, LayoutDashboard, Mic2, LifeBuoy, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "home", label: "Today", icon: Home },
  { id: "insights", label: "Dashboard", icon: LayoutDashboard },
  { id: "courage", label: "Voice", icon: Mic2 },
  { id: "help", label: "Support", icon: LifeBuoy },
]

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <>
      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/98 backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-card" />
      </nav>

      {/* Desktop sidebar navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-20 flex-col items-center border-r border-border bg-card/98 backdrop-blur-lg py-6 gap-2">
        {/* Logo */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-6 shadow-lg shadow-primary/25">
          <Leaf className="h-7 w-7 text-primary-foreground" />
        </div>

        {/* Navigation items */}
        <div className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Decorative leaf at bottom */}
        <div className="mt-auto opacity-30">
          <Leaf className="h-8 w-8 text-primary rotate-45" />
        </div>
      </nav>
    </>
  )
}
