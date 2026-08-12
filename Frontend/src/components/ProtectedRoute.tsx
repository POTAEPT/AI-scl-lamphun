import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#0f172a' }}>กำลังตรวจสอบสิทธิ์...</div>;
  }

  // ไม่ได้ล็อกอิน -> เด้งไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // กำหนด Role ว่าเข้าได้ไหม
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
