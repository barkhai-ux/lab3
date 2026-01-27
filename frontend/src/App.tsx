import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import MatchDetailPage from './pages/MatchDetailPage';
import InsightsPage from './pages/InsightsPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.isAuthenticated ? <Navigate to="/" /> : <LoginPage />
        }
      />
      <Route
        path="/auth/callback"
        element={<AuthCallback onAuth={auth.refetch} />}
      />
      <Route
        element={<ProtectedRoute isAuthenticated={auth.isAuthenticated} />}
      >
        <Route
          element={<Layout user={auth.user!} onLogout={auth.logout} />}
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/match/:matchId" element={<MatchDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
