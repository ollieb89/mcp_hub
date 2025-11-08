import { Suspense, lazy } from "react";
import { Box, CircularProgress, Toolbar } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./utils/query-client";
import Sidebar from "@components/Sidebar";
import Header from "@components/Header";

const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const ServersPage = lazy(() => import("@pages/ServersPage"));
const ToolsPage = lazy(() => import("@pages/ToolsPage"));
const ConfigPage = lazy(() => import("@pages/ConfigPage"));

const PageFallback = () => (
  <Box
    sx={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <CircularProgress aria-label="Loading page content" />
  </Box>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Sidebar />
      <Box
        component="main"
        sx={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Header />
        <Toolbar sx={{ minHeight: 64 }} />
        <Box component="section" sx={{ flex: 1, p: 3, overflow: "auto" }}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/servers" element={<ServersPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/configuration" element={<ConfigPage />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </Box>
    {/* React Query DevTools - only in development */}
    {import.meta.env.DEV && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    )}
  </QueryClientProvider>
);

export default App;
