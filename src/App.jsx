import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext';

// We'll create these soon
import Dashboard from './pages/Dashboard';
import DayDetail from './pages/DayDetail';
import Solver from './pages/Solver';
import VocabMode from './pages/VocabMode';
import StatsView from './pages/StatsView';
import GrandBank from './pages/GrandBank';

const MainLayout = () => {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/day/:dayNumber" element={<DayDetail />} />
        <Route path="/solve/:dayNumber/:mode" element={<Solver />} />
        <Route path="/vocab/:dayNumber" element={<VocabMode />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/bank" element={<GrandBank />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </AppProvider>
  );
}
