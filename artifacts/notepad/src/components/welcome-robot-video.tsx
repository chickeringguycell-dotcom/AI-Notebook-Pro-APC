import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { getCompanionUserProfile } from "@/lib/sovereign-aether-runtime";
import { ShipAnimation } from "@/components/ship-animation";

export type WelcomeSceneMode = "video" | "aria-muse" | "mini-bot" | "ship";

const SCENE_STORAGE_KEY = "ainotebook-welcome-scene-v1";

function loadInitialScene(): WelcomeSceneMode {
  try {
    const saved = localStorage.getItem(SCENE_STORAGE_KEY);
    if (
      saved === "video" ||
      saved === "aria-muse" ||
      saved === "mini-bot" ||
      saved === "ship"
    ) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "video";
}

/**
 * WelcomeRobotVideo — Defaults to the downloaded Gemini cybernetic AI welcome video
 * ("Welcome to My AI Notebook...") in place of the ship, and includes an inline
 * live switcher so the studio owner can compare the Video, Aria Gold Muse,
 * Mini Gold Robot Scribe, and Classic Tall Ship backup side-by-side live.
 */
export function WelcomeRobotVideo() {
  const [scene, setScene] = useState<WelcomeSceneMode>(loadInitialScene);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [endedWithSound, setEndedWithSound] = useState(false);

  const selectScene = (next: WelcomeSceneMode) => {
    setScene(next);
    try {
      localStorage.setItem(SCENE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const playWithSoundFromStart = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      setEndedWithSound(false);
      v.currentTime = 0;
      v.loop = false;
      v.muted = false;
      await v.play();
      setIsMuted(false);
      setNeedsSoundTap(false);
    } catch {
      try {
        v.muted = true;
        v.loop = true;
        await v.play();
        setIsMuted(true);
        setNeedsSoundTap(true);
      } catch {
        setIsMuted(true);
        setNeedsSoundTap(true);
      }
    }
  };

  useEffect(() => {
    if (scene !== "video") return;
    const v = videoRef.current;
    if (!v) return;

    const onboardingActive =
      !getCompanionUserProfile().onboardingCompleted ||
      new URLSearchParams(window.location.search).get("onboarding") === "1";

    if (onboardingActive) {
      v.muted = true;
      v.loop = true;
      v.play().catch(() => {});
      setIsMuted(true);
    } else {
      playWithSoundFromStart();
    }

    const onOnboardingComplete = () => {
      playWithSoundFromStart();
    };

    window.addEventListener("ainotebook:onboarding-complete", onOnboardingComplete);
    return () => {
      window.removeEventListener("ainotebook:onboarding-complete", onOnboardingComplete);
    };
  }, [scene]);

  const handleToggleSound = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted || needsSoundTap) {
      await playWithSoundFromStart();
    } else {
      v.muted = true;
      setIsMuted(true);
    }
  };

  const handleReplay = async () => {
    await playWithSoundFromStart();
  };

  return (
    <div className="flex flex-col items-center justify-center select-none gap-3">
      <style>{`
        @keyframes aetherGentleFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-7px) scale(1.015); }
        }
        @keyframes aetherWarmGlow {
          0%, 100% { box-shadow: 0 14px 36px rgba(138, 92, 36, 0.18); }
          50%      { box-shadow: 0 18px 44px rgba(188, 128, 48, 0.30); }
        }
      `}</style>

      {scene === "video" && (
        <div
          className="relative h-[248px] sm:h-[296px] md:h-[364px] lg:h-[396px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-amber-700/30 shadow-[0_14px_36px_rgba(88,56,24,0.22)] bg-[#dfd5c5] group cursor-pointer"
          onClick={() => {
            if (needsSoundTap || endedWithSound) {
              handleReplay();
            }
          }}
        >
          <video
            ref={videoRef}
            src="/icons/aria-welcome.mp4"
            playsInline
            preload="auto"
            onEnded={() => {
              if (!isMuted) {
                setEndedWithSound(true);
              }
            }}
            className="w-full h-full object-cover block"
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/35" />

          {needsSoundTap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReplay();
              }}
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3a2514]/85 hover:bg-[#3a2514] text-[#fdf4e3] text-xs font-medium shadow-md backdrop-blur-sm transition whitespace-nowrap"
            >
              <Volume2 className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>Tap for Sound</span>
            </button>
          )}

          {!needsSoundTap && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-85 group-hover:opacity-100 transition">
              <button
                type="button"
                title="Replay welcome"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReplay();
                }}
                className="h-7 w-7 rounded-full bg-black/55 hover:bg-black/75 text-amber-100 flex items-center justify-center backdrop-blur-sm shadow"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={isMuted ? "Unmute" : "Mute"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSound();
                }}
                className="h-7 w-7 rounded-full bg-black/55 hover:bg-black/75 text-amber-100 flex items-center justify-center backdrop-blur-sm shadow"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {scene === "aria-muse" && (
        <div
          style={{ animation: "aetherGentleFloat 4.4s ease-in-out infinite, aetherWarmGlow 4.4s ease-in-out infinite" }}
          className="relative h-[240px] sm:h-[280px] md:h-[330px] aspect-square rounded-3xl overflow-hidden border-2 border-amber-700/25 bg-[#f8f3eb]"
        >
          <img
            src="/icons/aria-muse-concept.jpg"
            alt="Aria Cybernetic Muse"
            className="w-full h-full object-cover block"
          />
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-amber-900/10" />
        </div>
      )}

      {scene === "mini-bot" && (
        <div
          style={{ animation: "aetherGentleFloat 3.6s ease-in-out infinite, aetherWarmGlow 3.6s ease-in-out infinite" }}
          className="relative h-[240px] sm:h-[280px] md:h-[330px] aspect-square rounded-3xl overflow-hidden border-2 border-amber-700/25 bg-[#f8f3eb]"
        >
          <img
            src="/icons/happy-robot-scribe.jpg"
            alt="Mini Gold AI Robot Scribe"
            className="w-full h-full object-cover block"
          />
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-amber-900/10" />
        </div>
      )}

      {scene === "ship" && (
        <div className="w-full max-w-sm md:scale-[1.25] md:origin-center my-4">
          <ShipAnimation />
        </div>
      )}

      {/* Live side-by-side comparison pills so Guy can test all 4 right in the app */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/75 border border-border/70 shadow-sm text-xs">
        {(
          [
            { id: "video", label: "🎬 Your Video" },
            { id: "aria-muse", label: "✨ Aria Gold Muse" },
            { id: "mini-bot", label: "🤖 Mini Gold Bot" },
            { id: "ship", label: "⛵ Ship Backup" },
          ] as const
        ).map((opt) => {
          const active = scene === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectScene(opt.id)}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
