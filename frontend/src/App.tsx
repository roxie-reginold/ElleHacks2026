import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Home from './pages/Home';
import ActiveListening from './pages/ActiveListening';
import Recap from './pages/Recap';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ContextClues from './pages/ContextClues';
import Layout from './components/ui/Layout';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="listen" element={<ActiveListening />} />
            <Route path="recap/:sessionId" element={<Recap />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="context-clues" element={<ContextClues />} />
          </Route>
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
