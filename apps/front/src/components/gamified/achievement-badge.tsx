"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Flame,
  Zap,
  Target,
  Medal,
  Crown,
  Sparkles,
  CheckCircle2,
  Phone,
  MessageSquare,
  TrendingUp,
  Shield,
  Award,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Achievement types
type AchievementType =
  | "NUMBER_CONFIRMED"
  | "POSITIVE_RESPONSE"
  | "LEAD_CONVERTED"
  | "CAMPAIGN_COMPLETED"
  | "STREAK_3_DAY"
  | "STREAK_7_DAY"
  | "STREAK_30_DAY"
  | "FIRST_CONTACT"
  | "SPEED_DEMON"
  | "INBOX_ZERO"
  | "TOP_PERFORMER"
  | "AI_ASSIST_MASTER"
  | "BLACKLIST_GUARDIAN"
  | "QUALITY_CHECKER";

type BadgeTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: React.ReactNode;
  pointsValue: number;
  earnedAt?: Date;
  progress?: number; // 0-100
  targetCount?: number;
  currentCount?: number;
}

// Tier configurations
const tierConfig: Record<BadgeTier, { color: string; glow: string; bg: string }> = {
  BRONZE: { color: "#cd7f32", glow: "rgba(205, 127, 50, 0.6)", bg: "rgba(205, 127, 50, 0.2)" },
  SILVER: { color: "#c0c0c0", glow: "rgba(192, 192, 192, 0.6)", bg: "rgba(192, 192, 192, 0.2)" },
  GOLD: { color: "#ffd700", glow: "rgba(255, 215, 0, 0.6)", bg: "rgba(255, 215, 0, 0.2)" },
  PLATINUM: { color: "#e5e4e2", glow: "rgba(229, 228, 226, 0.8)", bg: "rgba(229, 228, 226, 0.2)" },
  DIAMOND: { color: "#b9f2ff", glow: "rgba(185, 242, 255, 0.8)", bg: "rgba(185, 242, 255, 0.2)" },
};

// Achievement icon mapping
const achievementIcons: Record<AchievementType, React.ReactNode> = {
  NUMBER_CONFIRMED: <Phone className="w-6 h-6" />,
  POSITIVE_RESPONSE: <MessageSquare className="w-6 h-6" />,
  LEAD_CONVERTED: <Target className="w-6 h-6" />,
  CAMPAIGN_COMPLETED: <CheckCircle2 className="w-6 h-6" />,
  STREAK_3_DAY: <Flame className="w-6 h-6" />,
  STREAK_7_DAY: <Flame className="w-6 h-6" />,
  STREAK_30_DAY: <Flame className="w-6 h-6" />,
  FIRST_CONTACT: <Star className="w-6 h-6" />,
  SPEED_DEMON: <Zap className="w-6 h-6" />,
  INBOX_ZERO: <Trophy className="w-6 h-6" />,
  TOP_PERFORMER: <Crown className="w-6 h-6" />,
  AI_ASSIST_MASTER: <Sparkles className="w-6 h-6" />,
  BLACKLIST_GUARDIAN: <Shield className="w-6 h-6" />,
  QUALITY_CHECKER: <Award className="w-6 h-6" />,
};

// Single Badge Component
export function AchievementBadge({
  achievement,
  size = "md",
  showProgress = false,
  onClick,
}: {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  onClick?: () => void;
}) {
  const tier = tierConfig[achievement.tier];
  const isEarned = !!achievement.earnedAt;

  const sizeConfig = {
    sm: { badge: "w-12 h-12", icon: "w-5 h-5", text: "text-xs" },
    md: { badge: "w-16 h-16", icon: "w-6 h-6", text: "text-sm" },
    lg: { badge: "w-20 h-20", icon: "w-8 h-8", text: "text-base" },
  }[size];

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer"
    >
      <div className="relative">
        {/* Glow effect for earned badges */}
        {isEarned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("absolute inset-0 rounded-full", sizeConfig.badge)}
            style={{ boxShadow: `0 0 30px ${tier.glow}` }}
          />
        )}

        {/* Badge container */}
        <motion.div
          initial={{ rotateY: 0 }}
          whileHover={{ rotateY: 15 }}
          className={cn(
            "relative flex items-center justify-center rounded-full border-2",
            sizeConfig.badge,
            isEarned ? "opacity-100" : "opacity-40 grayscale"
          )}
          style={{
            backgroundColor: tier.bg,
            borderColor: tier.color,
            boxShadow: isEarned ? `0 4px 20px ${tier.glow}` : "none",
          }}
        >
          <div style={{ color: tier.color }}>{achievement.icon}</div>

          {/* Tier indicator */}
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: tier.color, color: "#1a1a2e" }}
          >
            {achievement.tier[0]}
          </div>
        </motion.div>

        {/* Progress ring for unearned */}
        {!isEarned && showProgress && achievement.progress !== undefined && (
          <svg
            className="absolute inset-0"
            style={{ width: sizeConfig.badge, height: sizeConfig.badge }}
          >
            <circle
              className="text-zinc-700"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
              r="45%"
              cx="50%"
              cy="50%"
            />
            <circle
              style={{ color: tier.color }}
              strokeWidth="3"
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="45%"
              cx="50%"
              cy="50%"
              strokeDasharray={`${achievement.progress * 2.83} 283`}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
      </div>

      <div className="text-center">
        <p className={cn("font-medium text-zinc-200", sizeConfig.text)}>
          {achievement.name}
        </p>
        {showProgress && !isEarned && (
          <p className="text-xs text-zinc-500">
            {achievement.currentCount}/{achievement.targetCount}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Achievement Notification Popup
export function AchievementPopup({
  achievement,
  isOpen,
  onClose,
}: {
  achievement: Achievement;
  isOpen: boolean;
  onClose: () => void;
}) {
  const tier = tierConfig[achievement.tier];

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${tier.glow}`,
                `0 0 40px ${tier.glow}`,
                `0 0 20px ${tier.glow}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex items-center gap-4 min-w-[400px]"
            style={{ borderColor: tier.color }}
          >
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: "50%",
                    y: "50%",
                    scale: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.05,
                  }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      i % 3 === 0
                        ? tier.color
                        : i % 3 === 1
                        ? "#ffd700"
                        : "#ff6b6b",
                  }}
                />
              ))}
            </div>

            {/* Badge */}
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="relative"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-4"
                style={{
                  backgroundColor: tier.bg,
                  borderColor: tier.color,
                  boxShadow: `0 0 30px ${tier.glow}`,
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  style={{ color: tier.color }}
                >
                  {achievement.icon}
                </motion.div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <div className="flex-1">
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-zinc-400 uppercase tracking-wider"
              >
                Achievement Unlocked!
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-zinc-100"
                style={{ color: tier.color }}
              >
                {achievement.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-zinc-400"
              >
                {achievement.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 mt-2"
              >
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">
                  +{achievement.pointsValue} points
                </span>
              </motion.div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Achievement Grid Display
export function AchievementGrid({
  achievements,
  onBadgeClick,
}: {
  achievements: Achievement[];
  onBadgeClick?: (achievement: Achievement) => void;
}) {
  const earned = achievements.filter((a) => a.earnedAt);
  const inProgress = achievements.filter((a) => !a.earnedAt);

  return (
    <div className="space-y-8">
      {/* Earned Achievements */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Earned ({earned.length})
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {earned.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              onClick={() => onBadgeClick?.(achievement)}
            />
          ))}
        </div>
      </div>

      {/* In Progress */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          In Progress ({inProgress.length})
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {inProgress.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              showProgress
              onClick={() => onBadgeClick?.(achievement)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook to manage achievements
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pendingPopup, setPendingPopup] = useState<Achievement | null>(null);

  const earnAchievement = (type: AchievementType) => {
    setAchievements((prev) =>
      prev.map((a) =>
        a.type === type && !a.earnedAt ? { ...a, earnedAt: new Date() } : a
      )
    );
    const earned = achievements.find((a) => a.type === type);
    if (earned) {
      setPendingPopup({ ...earned, earnedAt: new Date() });
    }
  };

  const incrementProgress = (type: AchievementType, amount = 1) => {
    setAchievements((prev) =>
      prev.map((a) => {
        if (a.type === type && !a.earnedAt) {
          const newCount = (a.currentCount || 0) + amount;
          const newProgress = Math.min(100, (newCount / (a.targetCount || 1)) * 100);

          // Auto-earn if target reached
          if (newCount >= (a.targetCount || 1)) {
            setPendingPopup({ ...a, earnedAt: new Date() });
            return { ...a, currentCount: newCount, progress: 100, earnedAt: new Date() };
          }

          return { ...a, currentCount: newCount, progress: newProgress };
        }
        return a;
      })
    );
  };

  const dismissPopup = () => setPendingPopup(null);

  return {
    achievements,
    setAchievements,
    earnAchievement,
    incrementProgress,
    pendingPopup,
    dismissPopup,
  };
}

export default AchievementBadge;
