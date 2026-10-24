import { useEffect, useState } from 'react';
import MapCanvas from './components/MapCanvas.jsx';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <main className="splash-screen">
        <div className="splash-screen__image" aria-hidden="true">
          <span>L.I.F.E.</span>
        </div>
        <h1>L.I.F.E.</h1>
        <p>Lunar Integrated Framework for Exploration</p>
      </main>
    );
  }

  return <MapCanvas />;
}

export default App;
