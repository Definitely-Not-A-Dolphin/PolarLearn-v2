"use client";

import { useRouteLoaderData } from "react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "~/lib/auth/client";
import type { RootLoaderData } from "~/lib/root-data";

export default function ImpersonationBanner() {
  const loaderData = useRouteLoaderData("root") as RootLoaderData | undefined
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loaderData?.impersonatedBy) {
      document.documentElement.style.removeProperty("--impersonation-banner-height");
      return;
    }

    const updateBannerHeight = () => {
      const height = bannerRef.current?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty(
        "--impersonation-banner-height",
        `${height}px`
      );
    };

    updateBannerHeight();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateBannerHeight);

    if (bannerRef.current) {
      observer?.observe(bannerRef.current);
    }

    window.addEventListener("resize", updateBannerHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateBannerHeight);
      document.documentElement.style.removeProperty("--impersonation-banner-height");
    };
  }, [loaderData?.impersonatedBy]);

  if (!loaderData?.impersonatedBy) {
    return null;
  }

  const handleEndImpersonation = async () => {
    setIsLoading(true);
    try {
      await authClient.admin.stopImpersonating();
      window.location.reload();
    } catch (error) {
      console.error("Failed to end impersonation:", error);
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={bannerRef}
      className="relative z-[60] bg-yellow-900/20 border-b border-yellow-900/30 px-4 py-3 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="text-sm text-yellow-800 dark:text-yellow-300">
          You are currently impersonating{" "}
          <span className="font-semibold">
            {loaderData.user.name || "?"}
          </span>
        </div>
      </div>
      <button
        onClick={handleEndImpersonation}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-800/40 hover:bg-yellow-800/60 text-yellow-800 dark:text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Ending..." : "End impersonation"}
        <X className="size-4" />
      </button>
    </div>
  );
}
