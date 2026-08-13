import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const TOTAL_DURATION = 2600;
const FADE_OUT_DURATION = 400;

function FlatArrow({ className, gradId }: { className?: string; gradId: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(50 100% 50%)" />
          <stop offset="100%" stopColor="hsl(33 100% 50%)" />
        </linearGradient>
      </defs>
      <path
        d="M8 20 L92 20"
        stroke={`url(#${gradId})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M82 6 L104 20 L82 34"
        stroke={`url(#${gradId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const total = reduced ? 600 : TOTAL_DURATION;

    const fadeTimer = setTimeout(() => setFadingOut(true), total);
    const doneTimer = setTimeout(() => onComplete(), total + FADE_OUT_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-label="Carregando Next Marketing"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-[400ms] ease-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(50 100% 50% / 0.08), transparent 60%)",
        }}
      />

      <div className="relative flex items-center justify-center">
        {/* Stage A: 3 arrows cascading horizontally, end-to-end */}
        <div className="splash-arrows-row absolute left-1/2 top-1/2 h-[40px] w-[300px] -translate-x-1/2 -translate-y-1/2">
          <div className="splash-arrow splash-arrow-1 absolute left-0 top-0 h-[40px] w-[100px]">
            <FlatArrow className="h-full w-full" gradId="arrowGrad1" />
          </div>
          <div className="splash-arrow splash-arrow-2 absolute left-[100px] top-0 h-[40px] w-[100px]">
            <FlatArrow className="h-full w-full" gradId="arrowGrad2" />
          </div>
          <div className="splash-arrow splash-arrow-3 absolute left-[200px] top-0 h-[40px] w-[100px]">
            <FlatArrow className="h-full w-full" gradId="arrowGrad3" />
          </div>
        </div>

        {/* Stage B: Logo + name (column, centered) */}
        <div className="splash-logo-block flex flex-col items-center gap-5">
          <img
            src="/favicon.png"
            alt="Next Marketing"
            className="splash-logo h-[120px] w-[120px] rounded-2xl object-contain"
            style={{ filter: "drop-shadow(0 0 30px hsl(50 100% 50% / 0.45))" }}
          />

          <div className="splash-name-wrap flex flex-col items-center gap-2">
            <div className="relative h-[2px] w-[200px] overflow-hidden">
              <div
                className="splash-sweep-line absolute inset-y-0 left-0 w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(50 100% 50%) 30%, hsl(33 100% 50%) 70%, transparent 100%)",
                  boxShadow:
                    "0 0 10px hsl(50 100% 50% / 0.7), 0 0 20px hsl(33 100% 50% / 0.4)",
                }}
              />
            </div>

            <h1 className="splash-text whitespace-nowrap text-2xl font-bold tracking-tight sm:text-3xl">
              <span className="bg-gradient-to-r from-[hsl(50_100%_50%)] to-[hsl(33_100%_50%)] bg-clip-text text-transparent">
                Next Marketing
              </span>
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
