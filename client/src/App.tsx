import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MissionShell } from "@/components/MissionShell";
import { AppShell } from "@/components/AppShell";
import { AppDataProvider } from "@/lib/state";
import { ThemeProvider } from "@/lib/theme";

// Public + new cockpit pages
import Landing from "@/pages/Landing";
import MissionControl from "@/pages/MissionControl";
import Succeed from "@/pages/Succeed";
import Direct from "@/pages/Direct";
import Enable from "@/pages/Enable";
import Admin from "@/pages/Admin";

// Legacy operational pages — kept behind /admin/* for AR admins
import CommandCentre from "@/pages/CommandCentre";
import Workstreams from "@/pages/Workstreams";
import Analysts from "@/pages/Analysts";
import Evidence from "@/pages/Evidence";
import LeaderLens from "@/pages/LeaderLens";
import Learning from "@/pages/Learning";
import Integrations from "@/pages/Integrations";
import Placeholder from "@/pages/Placeholder";

// AnalystGenius platform pages — live data from the AG intelligence API
import PlatformPulse from "@/pages/platform/PlatformPulse";
import PlatformFinancial from "@/pages/platform/PlatformFinancial";
import PlatformCompetitive from "@/pages/platform/PlatformCompetitive";
import PlatformReputation from "@/pages/platform/PlatformReputation";

function CockpitRouter() {
  return (
    <Switch>
      <Route path="/mission" component={MissionControl} />
      <Route path="/succeed" component={Succeed} />
      <Route path="/direct" component={Direct} />
      <Route path="/enable" component={Enable} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LegacyRouter() {
  return (
    <Switch>
      <Route path="/admin/command-centre" component={CommandCentre} />
      <Route path="/admin/workstreams" component={Workstreams} />
      <Route path="/admin/analysts" component={Analysts} />
      <Route path="/admin/evidence" component={Evidence} />
      <Route path="/admin/leader-lens" component={LeaderLens} />
      <Route path="/admin/learning" component={Learning} />
      <Route path="/admin/integrations" component={Integrations} />
      <Route path="/admin/platform/pulse" component={PlatformPulse} />
      <Route path="/admin/platform/financial" component={PlatformFinancial} />
      <Route path="/admin/platform/competitive" component={PlatformCompetitive} />
      <Route path="/admin/platform/reputation" component={PlatformReputation} />
      <Route path="/admin/platform/deep-research">
        <Placeholder
          eyebrow="AnalystGenius platform"
          title="Deep Research"
          description="On-demand analyst-grade research briefs. Lives in the wider AnalystGenius platform."
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedExperience() {
  const [location] = useHashLocation();

  // Root landing
  if (location === "/" || location === "") {
    return <Landing />;
  }

  // Cockpit pages — Mission Control, Succeed, Direct, Enable, Admin index
  const cockpitRoutes = ["/mission", "/succeed", "/direct", "/enable", "/admin"];
  if (cockpitRoutes.some((r) => location === r)) {
    return (
      <MissionShell>
        <CockpitRouter />
      </MissionShell>
    );
  }

  // Legacy operational pages stay in the old AppShell for AR admins
  if (location.startsWith("/admin/")) {
    return (
      <AppShell>
        <LegacyRouter />
      </AppShell>
    );
  }

  // Anything else — soft-route into Mission Control
  return (
    <MissionShell>
      <CockpitRouter />
    </MissionShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppDataProvider>
          <ThemeProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <RoutedExperience />
            </Router>
          </ThemeProvider>
        </AppDataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
