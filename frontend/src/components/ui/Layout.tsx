import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';

export default function Layout() {
  const location = useLocation();
  const isListening = location.pathname === '/listen';
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!isListening && <Navigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}
