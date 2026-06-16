import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import SchedulePage from '@/pages/SchedulePage';
import ApprovalPage from '@/pages/ApprovalPage';
import TimeoutPage from '@/pages/TimeoutPage';
import ManagementPage from '@/pages/ManagementPage';
import BottomNav from '@/components/layout/BottomNav';
import '@/index.css';

function AppContent() {
  const location = useLocation();
  const showBottomNav = [
    '/',
    '/approval',
    '/timeout',
    '/management',
  ].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto relative">
        <Routes>
          <Route path="/" element={<SchedulePage />} />
          <Route path="/approval" element={<ApprovalPage />} />
          <Route path="/timeout" element={<TimeoutPage />} />
          <Route path="/management" element={<ManagementPage />} />
        </Routes>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
