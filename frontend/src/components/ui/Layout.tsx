import { Outlet, useLocation } from 'react-router-dom';
import Navigation from './Navigation';

export default function Layout() {
  const location = useLocation();
  const isListening = location.pathname === '/listen';

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!isListening && <Navigation />}
    </div>
  );
}
