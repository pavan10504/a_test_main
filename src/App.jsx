import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WorldProvider } from './context/WorldContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Home from './pages/Home';
import WorldBuilder from './pages/WorldBuilder';
import AutoTrain from './pages/car/Auto';
import Manual from './pages/car/Manual';
import CitySimulation from './pages/CitySimulation';
import NotFound from './pages/NotFound';

function App() {
  return (
    <WorldProvider>
      <Router>
        <ErrorBoundary>
          <div className="w-screen h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/world-builder" element={<WorldBuilder />} />
              <Route path="/car/auto" element={<AutoTrain />} />
              <Route path="/car/manual" element={<Manual />} />
              <Route path="/city-simulation" element={<CitySimulation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </WorldProvider>
  );
}

export default App;


