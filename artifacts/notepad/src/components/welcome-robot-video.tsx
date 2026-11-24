import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { getCompanionUserProfile } from "@/lib/sovereign-aether-runtime";

/**
 * WelcomeRobotVideo — Plays the cybernetic AI companion welcome video
 * ("Welcome to My AI Notebook...") with volume ON by default and a clean,
 * unobstructed portrait frame (hover-only subtle controls; tap to replay).
 * Classic ShipAnimation (/icons/ship.png) is preserved in backups/classic_tall_ship
 * and src/components/ship-animation.tsx for future use.
 */
export function WelcomeRobotVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [ended, setEnded] = useState(false);

  const playUnmutedFromStart = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      setEnded(false);
      v.currentTime = 0;
      v.volume = 1.0;
      v.muted = false;
      v.loop = false;
      await v.play();
      setIsMuted(false);
    } catch {
      // If a desktop browser requires one initial gesture on a cold reload,
      // start smoothly and unmute automatically on first interaction.
      try {
        v.muted = true;
        v.loop = true;
        await v.play();
        setIsMuted(true);

        const unlockOnce = () => {
          const vid = videoRef.current;
          if (!vid) return;
          vid.currentTime = 0;
          vid.volume = 1.0;
          vid.muted = false;
          vid.loop = false;
          vid.play().catch(() => {});
          setIsMuted(false);
          setEnded(false);
        };
        window.addEventListener("pointerdown", unlockOnce, { once: true });
        window.addEventListener("keydown", unlockOnce, { once: true });
      } catch {
        setIsMuted(true);
      }
    }
  };

  useEffect(() => {
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
      playUnmutedFromStart();
    }

    const onOnboardingComplete = () => {
      playUnmutedFromStart();
    };

    window.addEventListener("ainotebook:onboarding-complete", onOnboardingComplete);
    return () => {
      window.removeEventListener("ainotebook:onboarding-complete", onOnboardingComplete);
    };
  }, []);

  const handleCardClick = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (ended || v.paused || isMuted) {
      await playUnmutedFromStart();
    } else {
      v.muted = true;
      setIsMuted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        onClick={handleCardClick}
        title={ended ? "Tap to replay welcome" : isMuted ? "Tap to unmute" : "Tap to mute"}
        className="relative h-[340px] sm:h-[410px] md:h-[min(62vh,590px)] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-amber-700/30 shadow-[0_16px_42px_rgba(88,56,24,0.24)] bg-[#dfd5c5] group cursor-pointer"
      >
        <video
          ref={videoRef}
          src="/icons/aria-welcome.mp4"
          autoPlay
          playsInline
          preload="auto"
          onEnded={() => setEnded(true)}
          className="w-full h-full object-cover block"
        />

        {/* Soft inner gallery highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/35" />

        {/* Whisper-subtle hover-only controls (completely invisible unless hovering with mouse) */}
        <div className="hidden md:flex absolute bottom-2 right-2 items-center gap-1 opacity-0 group-hover:opacity-85 transition-opacity duration-200">
          <button
            type="button"
            title="Replay welcome"
            onClick={(e) => {
              e.stopPropagation();
              playUnmutedFromStart();
            }}
            className="h-7 w-7 rounded-full bg-black/50 hover:bg-black/75 text-amber-100 flex items-center justify-center backdrop-blur-sm shadow"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={isMuted ? "Unmute" : "Mute"}
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (!v) return;
              if (isMuted) {
                playUnmutedFromStart();
              } else {
                v.muted = true;
                setIsMuted(true);
              }
            }}
            className="h-7 w-7 rounded-full bg-black/50 hover:bg-black/75 text-amber-100 flex items-center justify-center backdrop-blur-sm shadow"
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
