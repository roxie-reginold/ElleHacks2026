import { Navigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

/**
 * Only users with role 'teacher' can see the teacher dashboard.
 * Others are redirected to the student app (/).
 */
export function TeacherDashboardGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const isTeacher = user?.role === 'teacher';
  if (!isTeacher) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
