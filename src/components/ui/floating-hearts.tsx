import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Heart {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  type: "pink" | "red" | "gradient";
}

export const triggerFloatingHearts = () => {
  window.dispatchEvent(new CustomEvent("trigger-floating-hearts"));
};

export const FloatingHeartsProvider = ({ children }: { children: React.ReactNode }) => {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      setIsActive(true);
      
      const newHearts: Heart[] = Array.from({ length: 25 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        size: Math.random() * 30 + 20,
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 2,
        type: ["pink", "red", "gradient"][Math.floor(Math.random() * 3)] as Heart["type"],
      }));
      
      setHearts(newHearts);
      
      setTimeout(() => {
        setIsActive(false);
        setHearts([]);
      }, 4000);
    };

    window.addEventListener("trigger-floating-hearts", handleTrigger);
    return () => window.removeEventListener("trigger-floating-hearts", handleTrigger);
  }, []);

  return (
    <>
      {children}
      {isActive && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          <AnimatePresence>
            {hearts.map((heart) => (
              <motion.div
                key={heart.id}
                initial={{ 
                  y: "100vh", 
                  x: `${heart.x}vw`, 
                  opacity: 1,
                  rotate: 0,
                  scale: 0.5
                }}
                animate={{ 
                  y: "-20vh", 
                  opacity: 0,
                  rotate: Math.random() > 0.5 ? 360 : -360,
                  scale: 1
                }}
                transition={{ 
                  duration: heart.duration,
                  delay: heart.delay,
                  ease: "easeOut"
                }}
                className="absolute"
                style={{ left: 0 }}
              >
                <HeartIcon type={heart.type} size={heart.size} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  );
};

const HeartIcon = ({ type, size }: { type: "pink" | "red" | "gradient"; size: number }) => {
  const colors: Record<string, string> = {
    pink: "#ff69b4",
    red: "#ff1493",
    gradient: "url(#heartGradient)"
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={colors[type]}
      style={{ filter: "drop-shadow(0 2px 4px rgba(255, 105, 180, 0.5))" }}
    >
      <defs>
        <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff69b4" />
          <stop offset="50%" stopColor="#ff1493" />
          <stop offset="100%" stopColor="#ffd700" />
        </linearGradient>
      </defs>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
};
