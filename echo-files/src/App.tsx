import { Routes, Route, Navigate } from 'react-router-dom';
import StartPage from './pages/StartPage';
import CredentialPage from './pages/CredentialPage';
import ArchiveHubPage from './pages/ArchiveHubPage';
import MemoryPage from './pages/MemoryPage';
import IntermissionPage from './pages/IntermissionPage';
import EndingPage from './pages/EndingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/credential" element={<CredentialPage />} />
      <Route path="/archive-hub" element={<ArchiveHubPage />} />
      <Route path="/memory" element={<MemoryPage />} />
      <Route path="/intermission" element={<IntermissionPage />} />
      <Route path="/ending" element={<EndingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
