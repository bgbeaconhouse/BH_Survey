import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SurveyPage } from "./pages/SurveyPage";
import { LoginPage, AdminPage, DashboardPage, ParticipantDetailPage, ThankYouPage } from "./pages";
import { ExportPage } from "./pages/ExportPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard/:cohortId" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard/:cohortId/participant/:participantId" element={<ProtectedRoute><ParticipantDetailPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}