/*
  Real ship image (background removed) with gentle bow-dip motion,
  layered rolling ocean swells, and a physics-timed bow-impact wave splash
  right at 38% when the bow dips down into the water.
*/
export function ShipAnimation() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        overflow: "hidden",
        height: "168px",
        width: "100%",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes bowDip {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          38%      { transform: translateY(4px) rotate(4.2deg); }
          68%      { transform: translateY(-2px) rotate(-2deg); }
        }
        @keyframes oceanSwellBack {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes oceanSwellFront {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes bowSplashBurst {
          0%, 28% {
            opacity: 0;
            transform: translate(0px, 6px) scale(0.45);
          }
          38% {
            opacity: 0.92;
            transform: translate(-6px, -4px) scale(1.05);
          }
          54% {
            opacity: 0.45;
            transform: translate(-18px, -8px) scale(1.25);
          }
          68%, 100% {
            opacity: 0;
            transform: translate(-28px, 4px) scale(0.9);
          }
        }
        @keyframes bowRippleSpread {
          0%, 30% {
            opacity: 0;
            transform: scaleX(0.4);
          }
          40% {
            opacity: 0.65;
            transform: scaleX(1);
          }
          70%, 100% {
            opacity: 0;
            transform: scaleX(1.85);
          }
        }
      `}</style>

      {/* Back ocean swell behind hull */}
      <svg
        viewBox="0 0 800 36"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          bottom: "8px",
          left: 0,
          width: "200%",
          height: "28px",
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: "none",
          animation: "oceanSwellBack 7s linear infinite",
        }}
      >
        <path
          d="M0,18 Q50,6 100,18 T200,18 T300,18 T400,18 T500,18 T600,18 T700,18 T800,18 L800,36 L0,36 Z"
          fill="#6e98b8"
        />
      </svg>

      {/* Original tall ship image — untouched asset, gentle bow dip */}
      <img
        src="/icons/ship.png"
        alt="Tall ship"
        style={{
          height: "148px",
          width: "auto",
          display: "block",
          transformOrigin: "88% 84%",
          animation: "bowDip 3.5s ease-in-out infinite",
          position: "relative",
          zIndex: 1,
          marginBottom: "6px",
        }}
      />

      {/* Timed bow-dip splash & whitecap spray (peaks right at 38% bow impact) */}
      <svg
        viewBox="0 0 90 48"
        style={{
          position: "absolute",
          bottom: "10px",
          left: "calc(50% - 92px)",
          width: "74px",
          height: "40px",
          zIndex: 3,
          pointerEvents: "none",
          animation: "bowSplashBurst 3.5s ease-out infinite",
        }}
      >
        <path
          d="M68,38 C56,34 46,24 34,18 C42,27 45,33 42,38 Z"
          fill="#d8eef9"
          stroke="#7ba7c7"
          strokeWidth="1.2"
        />
        <path
          d="M58,38 C48,30 35,25 22,26 C33,31 38,35 38,38 Z"
          fill="#eef8fd"
        />
        <circle cx="28" cy="14" r="2.6" fill="#9ec3de" />
        <circle cx="18" cy="20" r="2.0" fill="#9ec3de" />
        <circle cx="38" cy="11" r="1.8" fill="#b7d6ec" />
      </svg>

      {/* Expanding water ring under the bow on impact */}
      <div
        style={{
          position: "absolute",
          bottom: "9px",
          left: "calc(50% - 82px)",
          width: "68px",
          height: "6px",
          borderRadius: "999px",
          background: "radial-gradient(ellipse at center, rgba(122,168,201,0.55) 0%, rgba(122,168,201,0) 75%)",
          zIndex: 3,
          pointerEvents: "none",
          animation: "bowRippleSpread 3.5s ease-out infinite",
        }}
      />

      {/* Foreground translucent wave crest gliding across the hull waterline */}
      <svg
        viewBox="0 0 800 34"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          bottom: "0px",
          left: 0,
          width: "200%",
          height: "26px",
          zIndex: 2,
          opacity: 0.34,
          pointerEvents: "none",
          animation: "oceanSwellFront 5.2s linear infinite",
        }}
      >
        <path
          d="M0,15 Q40,4 80,15 T160,15 T240,15 T320,15 T400,15 T480,15 T560,15 T640,15 T720,15 T800,15 L800,34 L0,34 Z"
          fill="#7ca6c4"
        />
      </svg>
    </div>
  );
}
