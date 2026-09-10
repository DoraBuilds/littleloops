import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParentSchedulesNavItem } from "@/components/ParentSchedulesNavItem";
import { AuthProvider } from "@/lib/auth/auth-context";
import { APP_VERSION, getRefreshUrl, getVersionManifestUrl } from "@/lib/app-version";
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

const AppShell = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkForUpdate = async () => {
      try {
        const response = await fetch(getVersionManifestUrl(), { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { version?: string };
        const nextVersion = payload.version?.trim();
        if (isMounted && nextVersion && nextVersion !== APP_VERSION) setLatestVersion(nextVersion);
      } catch {
        // Keep the current app running quietly when version checks fail.
      }
    };
    void checkForUpdate();
    const intervalId = window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL);
    const refreshOnFocus = () => { if (document.visibilityState === "visible") void checkForUpdate(); };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  return <>
    <Toaster />
    <Sonner />
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ParentSchedulesNavItem />
      <Suspense fallback={<div className="flex min-h-svh items-center justify-center px-5 py-10"><div className="w-full max-w-lg rounded-[32px] border border-border bg-card p-8 text-center shadow-card"><p className="text-sm font-black uppercase tracking-[0.22em] text-primary">Loading Little Loops</p><h1 className="mt-4 text-3xl font-bold text-foreground">Getting everything ready</h1><p className="mt-3 text-sm text-muted-foreground">This should only take a moment.</p></div></div>}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/parent/schedules" element={<SchedulesPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    {latestVersion && <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"><div className="pointer-events-auto flex max-w-xl flex-col gap-3 rounded-[28px] border border-primary/20 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.22em] text-primary">Update Ready</p><p className="mt-1 text-sm text-muted-foreground">A fresher version of Little Loops is available.</p></div><button type="button" onClick={() => window.location.assign(getRefreshUrl(latestVersion))} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-button transition-transform active:translate-y-0.5"><RefreshCw size={16} />Refresh now</button></div></div>}
  </>;
};

const App = () => <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><AppShell /></TooltipProvider></AuthProvider></QueryClientProvider>;
export default App;
