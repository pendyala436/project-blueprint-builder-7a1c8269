import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BasicInfoScreen from "./pages/BasicInfoScreen";
import PhotoUploadScreen from "./pages/PhotoUploadScreen";
import LocationSetupScreen from "./pages/LocationSetupScreen";
import LanguagePreferencesScreen from "./pages/LanguagePreferencesScreen";
import TermsAgreementScreen from "./pages/TermsAgreementScreen";
import PasswordSetupScreen from "./pages/PasswordSetupScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/basic-info" element={<BasicInfoScreen />} />
          <Route path="/photo-upload" element={<PhotoUploadScreen />} />
          <Route path="/location-setup" element={<LocationSetupScreen />} />
          <Route path="/language-preferences" element={<LanguagePreferencesScreen />} />
          <Route path="/terms-agreement" element={<TermsAgreementScreen />} />
          <Route path="/password-setup" element={<PasswordSetupScreen />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
