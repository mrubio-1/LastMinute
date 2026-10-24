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
      <div className="splash-screen__brand">
        <div className="splash-screen__image">
          <img
            src="/assets/logo/LIFE%20logo.png"
            alt="L.I.F.E. lunar mission logo"
          />
        </div>
        <h1>L.I.F.E.</h1>
      </div>
      <p>Lunar Integrated Framework for Exploration</p>
    </main>
    );
  }

  return <MapCanvas />;
}

export default App;
