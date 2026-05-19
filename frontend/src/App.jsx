import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import TestEditor from './pages/admin/TestEditor';
import Results from './pages/admin/Results';
import ResultDetail from './pages/admin/ResultDetail';
import Enter from './pages/participant/Enter';
import TakeTest from './pages/participant/TakeTest';
import Done from './pages/participant/Done';

function RequireAuth({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/admin/tests/new" element={<RequireAuth><TestEditor /></RequireAuth>} />
      <Route path="/admin/tests/:id" element={<RequireAuth><TestEditor /></RequireAuth>} />
      <Route path="/admin/results" element={<RequireAuth><Results /></RequireAuth>} />
      <Route path="/admin/results/:id" element={<RequireAuth><ResultDetail /></RequireAuth>} />
      <Route path="/test/enter" element={<Enter />} />
      <Route path="/test/done" element={<Done />} />
      <Route path="/test/:sessionId" element={<TakeTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
