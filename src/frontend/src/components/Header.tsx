import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { formatCountdown } from "../utils/format";
import { PushNotificationButton } from "./PushNotificationButton";

interface HeaderProps {
  countdown: number;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  signalCount: number;
  isFromCache?: boolean;
}

export function Header({
  countdown,
  lastUpdated,
  onRefresh,
  isRefreshing,
  signalCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-md bg-signal-green/10 border border-signal-green/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-signal-green" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-signal-green animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none text-foreground tracking-tight">
                CryptoScalp
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 font-mono">
                {"~110 coins • Solo segnali LONG"}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Center stats */}
        <div className="hidden md:flex items-center gap-4">
          {signalCount > 0 && (
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-signal-green/10 border border-signal-green/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse-signal" />
              <span className="text-signal-green font-mono text-xs font-medium">
                {signalCount} LONG {signalCount === 1 ? "segnale" : "segnali"}{" "}
                attivi
              </span>
            </motion.div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              <span>
                {lastUpdated.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border border-border"
            data-ocid="header.countdown"
          >
            <span className="text-muted-foreground">Aggiornamento in</span>
            <span className="text-signal-green font-medium">
              {formatCountdown(countdown)}
            </span>
          </div>

          <PushNotificationButton />

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border-border hover:border-signal-green/50 hover:text-signal-green h-8 px-3"
            data-ocid="header.button"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline ml-1.5 text-xs">Aggiorna</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
