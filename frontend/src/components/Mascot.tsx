import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const MASCOT_IMAGE = "/images/mascot.png"
const MASCOT_POINTING = "/images/mascot-pointing.png"

interface MascotProps {
    variant?: "default" | "pointing" | "small" | "large"
    position?: "left" | "right" | "center"
    className?: string
    animate?: boolean
    message?: string
}

export function Mascot({
    variant = "default",
    position = "right",
    className,
    animate = true,
    message
}: MascotProps) {
    const imageSrc = variant === "pointing" ? MASCOT_POINTING : MASCOT_IMAGE

    const sizeClasses = {
        default: "w-24 h-auto",
        small: "w-16 h-auto",
        large: "w-32 h-auto",
        pointing: "w-28 h-auto"
    }

    const positionClasses = {
        left: "self-start",
        right: "self-end ml-auto",
        center: "mx-auto"
    }

    return (
        <motion.div
            initial={animate ? { opacity: 0, scale: 0.8, y: 20 } : undefined}
            animate={animate ? { opacity: 1, scale: 1, y: 0 } : undefined}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className={cn(
                "flex flex-col items-center gap-2",
                positionClasses[position],
                className
            )}
        >
            <motion.img
                src={imageSrc}
                alt="Whisper - your friendly companion"
                className={cn(
                    sizeClasses[variant],
                    "drop-shadow-lg object-contain",
                    animate && "animate-float"
                )}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                whileHover={{ scale: 1.05 }}
            />
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="px-3 py-2 bg-card border border-border rounded-xl shadow-sm max-w-[180px]"
                >
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        {message}
                    </p>
                </motion.div>
            )}
        </motion.div>
    )
}

// Floating mascot that can be positioned absolutely
export function FloatingMascot({
    variant = "small",
    className,
    message
}: Omit<MascotProps, "position">) {
    const imageSrc = variant === "pointing" ? MASCOT_POINTING : MASCOT_IMAGE

    const sizeClasses = {
        default: "w-20 h-auto",
        small: "w-14 h-auto",
        large: "w-28 h-auto",
        pointing: "w-24 h-auto"
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
            className={cn(
                "hidden lg:flex flex-col items-center gap-2",
                className
            )}
        >
            <motion.img
                src={imageSrc}
                alt="Whisper - your friendly companion"
                className={cn(
                    sizeClasses[variant],
                    "drop-shadow-md object-contain animate-float"
                )}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            {message && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="px-2 py-1.5 bg-primary/10 border border-primary/20 rounded-lg max-w-[150px]"
                >
                    <p className="text-[10px] text-primary text-center leading-snug font-medium">
                        {message}
                    </p>
                </motion.div>
            )}
        </motion.div>
    )
}

export default Mascot
