import React, { useRef, useEffect, useState, Suspense } from 'react';
import Globe from 'react-globe.gl';
import earthTextureUrl from '../assets/earth-texture.jpg';

// Simple Error Boundary component for Globe
class GlobeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Globe3D Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--card-bg)] rounded-3xl border border-dashed border-[var(--border)] p-8">
           <p className="text-[var(--text-muted)] font-bold text-sm text-center">
             Impossibile caricare il mappamondo 3D su questo dispositivo.
           </p>
           <div className="w-24 h-24 mt-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
             <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
           </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const Globe3D = ({ itineraries, className }: { itineraries: any[], className?: string }) => {
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({ 
          width: containerRef.current.clientWidth, 
          height: containerRef.current.clientHeight || 400 
        });
      }
    };

    updateDimensions();
    
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (globeEl.current && isLoaded) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.6;
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    }
  }, [isLoaded]);

  const pointsData = (itineraries || []).map(it => ({
    lat: Number(it.lat) || 0,
    lng: Number(it.lng) || 0,
    name: it.city,
    color: '#10b981'
  }));

  return (
    <div ref={containerRef} className={className || "w-full h-[300px] sm:h-[400px] relative overflow-hidden rounded-3xl"}>
      <GlobeErrorBoundary>
        {dimensions.width > 0 && (
          <Globe
            ref={globeEl}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl={earthTextureUrl}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#3b82f6"
            atmosphereAltitude={0.15}
            pointsData={pointsData}
            pointRadius={0.1}
            pointColor="color"
            pointAltitude={0.01}
            pointsMerge={false}
            pointLabel={(d: any) => `
              <div style="background: rgba(0,0,0,0.85); color: white; padding: 10px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(12px); font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
                <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px;">${d.name}</div>
                <div style="font-size: 10px; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900;">Destinazione Raggiunta</div>
              </div>
            `}
            ringsData={pointsData}
            ringColor={() => '#10b981'}
            ringMaxRadius={2.5}
            ringPropagationSpeed={2.5}
            ringRepeatPeriod={1200}
            onGlobeReady={() => setIsLoaded(true)}
          />
        )}
        
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg)]/50 backdrop-blur-sm z-10 transition-opacity duration-500">
             <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Sincronizzazione Mappa...</p>
          </div>
        )}
      </GlobeErrorBoundary>
      
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-transparent pointer-events-none z-[5]" />
    </div>
  );
};
