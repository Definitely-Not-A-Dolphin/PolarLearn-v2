// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { useRef, useEffect } from "react";
import pl_logo from "~/img/polarlearn.svg";
import pnl_logo from "~/img/pnl.svg";
import { Button } from "@polarnl/polarui-react";
import { useNavigate, useRouteLoaderData } from "react-router";
import i18n from "~/i18n";

function DescriptionReveal() {
  const rootData = useRouteLoaderData("root");
  const theme = rootData?.theme ?? "dark";
  const textColorClass = theme === "dark" ? "text-white" : "text-gray-800";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const delayTimer = setTimeout(async () => {
      if (!mounted) return;

      const gsapMod = await import("gsap");
      const gsap = (gsapMod as any).default ?? gsapMod;

      const words = wordRefsRef.current;
      if (!words.length) return;

      tlRef.current?.kill?.();

      gsap.set(containerRef.current, { opacity: 0 });
      gsap.set(words, { filter: "blur(8px)", opacity: 0 });

      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(containerRef.current, { opacity: 1, duration: 0 }, 0);

      words.forEach((word, index) => {
        tl.to(
          word,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
          },
          index * 0.15
        );
      });

      return () => tl.kill();
    }, 3300);

    return () => {
      mounted = false;
      clearTimeout(delayTimer);
      tlRef.current?.kill?.();
    };
  }, [theme]);

  const description = i18n.t("home.description");
  const words = description.split(" ");

  return (
    <p
      ref={containerRef}
      className={`opacity-0 text-[clamp(14px,2vw,18px)] ${textColorClass}`}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className="mr-[0.25em] inline-block text-4xl font-bold"
          ref={(el) => {
            wordRefsRef.current[index] = el;
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

function TextRevealInline() {
  const rootData = useRouteLoaderData("root");
  const theme = rootData?.theme ?? "dark";
  const learnColorClass = theme === "dark" ? "text-white stroke-white" : "text-gray-500 stroke-gray-500";

  const outerTextRef = useRef<SVGTextElement | null>(null);
  const innerSvgRef = useRef<SVGSVGElement | null>(null);
  const clipRectRef = useRef<SVGRectElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const pnlRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const textWrapperRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;

      const gsapMod = await import("gsap");
      const gsap = (gsapMod as any).default ?? gsapMod;
      const scrollMod = await import("gsap/ScrollTrigger");
      const ScrollTrigger = (scrollMod as any).ScrollTrigger ?? (scrollMod as any).default ?? scrollMod;
      gsap.registerPlugin(ScrollTrigger);

      const outerText = outerTextRef.current;
      const innerSvg = innerSvgRef.current;
      const logo = logoRef.current;
      const textWrap = textWrapperRef.current;
      const group = groupRef.current;
      const clipRect = clipRectRef.current;
      if (!outerText || !innerSvg || !logo || !textWrap || !clipRect || !group) return;

      tlRef.current?.kill?.();

      gsap.set(outerText, {
        strokeDasharray: 900,
        strokeDashoffset: 900,
      });
      gsap.set(clipRect, { attr: { width: 0 } });
      const logoWidth = 72;
      const gap = -15;
      gsap.set(logo, { position: "absolute", left: -(logoWidth + gap) - 120, top: "50%", y: "-50%", opacity: 0, width: logoWidth });
      gsap.set(textWrap, { x: 0 });

      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(outerText, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, 0);

      tl.to(
        clipRect,
        { attr: { width: 540 }, duration: 2 / 3, ease: "power1.in" },
        2 * 0.55,
      );

      const groupRect = group.getBoundingClientRect();
      const outerTextRect = outerText.getBoundingClientRect();
      const finalLogoLeft = outerTextRect.left - groupRect.left - logoWidth - gap;
      const textShift = (logoWidth + gap) / 2;

      tl.to(logo, { left: finalLogoLeft, opacity: 1, duration: 0.6, ease: "power2.out" }, ">+0.15");
      tl.to(textWrap, { x: textShift, duration: 0.6, ease: "power2.out" }, "<");

      const pnlContainer = pnlRef.current;
      if (pnlContainer) {
        const pnlRect = pnlContainer.getBoundingClientRect();
        const pnlHeight = pnlRect.height || 40;
        const gapAbove = 12;
        const baseTop = outerTextRect.top - groupRect.top - pnlHeight - gapAbove;

        gsap.set(pnlContainer, { top: baseTop, y: -120, opacity: 0 });
        tl.to(pnlContainer, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, ">+0.15");
      }

      return () => tl.kill();
    })();

    return () => {
      mounted = false;
      tlRef.current?.kill?.();
    };
  }, [theme]);

  const textProps = {
    x: "50%",
    y: "55%",
    dominantBaseline: "middle" as const,
    textAnchor: "middle" as const,
    fontSize: "clamp(40px, 7vw, 56px)",
    fontWeight: 500 as const,
  };
  return (
    <div
      className="flex w-full items-center justify-center gap-[clamp(16px,6vw,40px)] -mb-16"
    >
      <div ref={groupRef} className="relative inline-block w-[min(90vw,900px)] max-w-225">
        <img ref={logoRef} src={pl_logo} alt="PolarLearn" className="block h-auto w-0" />

        <div
          ref={pnlRef}
          className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 opacity-0"
        >
          <img src={pnl_logo} alt="PolarNL" className="block h-8 w-auto" />
          <div className={`text-[18px] font-semibold leading-none ${learnColorClass}`}>{"PolarNL Group Presents"}</div>
        </div>

        <div ref={textWrapperRef} className="grid w-full place-items-center">
          <svg className="col-start-1 row-start-1 w-full overflow-visible" viewBox="0 0 540 110" aria-hidden>
            <defs>
              <linearGradient id="polarGradientStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(56, 189, 248)" />
                <stop offset="100%" stopColor="rgb(191, 219, 254)" />
              </linearGradient>
            </defs>
            <text
              ref={outerTextRef}
              {...textProps}
              fill="none"
              strokeWidth={1}
              strokeDasharray={900}
              strokeDashoffset={900}
            >
              <tspan stroke="url(#polarGradientStroke)">Polar</tspan>
              <tspan stroke={theme === "dark" ? "#ffffff" : "#6b7280"}>Learn</tspan>
            </text>
          </svg>

          {/* filled layer */}
          <svg ref={innerSvgRef} className="col-start-1 row-start-1 w-full overflow-visible" viewBox="0 0 540 110" aria-hidden>
            <defs>
              <clipPath id="fillClip">
                <rect ref={clipRectRef} x="0" y="0" width="0" height="110" />
              </clipPath>
              <linearGradient id="polarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(56, 189, 248)" />
                <stop offset="100%" stopColor="rgb(191, 219, 254)" />
              </linearGradient>
              <linearGradient id="polarGradientStrokeFill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(56, 189, 248)" />
                <stop offset="100%" stopColor="rgb(191, 219, 254)" />
              </linearGradient>
            </defs>
            <text {...textProps} strokeWidth={0.5} clipPath="url(#fillClip)">
              <tspan fill="url(#polarGradient)" stroke="url(#polarGradientStrokeFill)">Polar</tspan>
              <tspan fill={theme === "dark" ? "#ffffff" : "#6b7280"} stroke={theme === "dark" ? "#ffffff" : "#6b7280"}>Learn</tspan>
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function AnimatedButton() {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const delayTimer = setTimeout(async () => {
      if (!mounted) return;

      const gsapMod = await import("gsap");
      const gsap = (gsapMod as any).default ?? gsapMod;

      const button = buttonRef.current;
      if (!button) return;

      tlRef.current?.kill?.();

      gsap.set(button, { opacity: 0, y: 40 });

      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(button, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    }, 4200);

    return () => {
      mounted = false;
      clearTimeout(delayTimer);
      tlRef.current?.kill?.();
    };
  }, []);
  const nav = useNavigate()

  return (
    <div ref={buttonRef} className="opacity-0">
      <Button onClick={() => {
        nav("/auth/sign-in")
      }}>
        Start met leren
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center gap-3 w-full py-12">
      <TextRevealInline />
      <div className="h-4" />
      <DescriptionReveal />
      <div className="h-4" />

      <AnimatedButton />
    </main>
  );
}
