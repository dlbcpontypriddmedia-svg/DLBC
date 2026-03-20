import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PageLoader from "./components/PageLoader";

const Index = lazy(() => import("./pages/Index"));
const Stream = lazy(() => import("./pages/Stream"));
const AttendanceLogin = lazy(() => import("./pages/AttendanceLogin"));
const AttendanceDashboard = lazy(() => import("./pages/AttendanceDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader label="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stream" element={<Stream />} />
            <Route path="/attendance/login" element={<AttendanceLogin />} />
            <Route path="/attendance/dashboard" element={<AttendanceDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
