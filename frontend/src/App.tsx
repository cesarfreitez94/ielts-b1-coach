import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vocabulary from './pages/Vocabulary';
import Speaking from './pages/Speaking';
import Writing from './pages/Writing';
import Tutor from './pages/Tutor';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import AdminLogs from './pages/AdminLogs';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

function App() {
  const { token } = useAuthStore();

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="speaking" element={<Speaking />} />
          <Route path="writing" element={<Writing />} />
          <Route path="tutor" element={<Tutor />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="settings" element={<Settings />} />
          <Route path="/admin/logs" element={<ProtectedAdminRoute><AdminLogs /></ProtectedAdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;