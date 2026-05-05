import React, { useRef, useEffect, useState, memo } from 'react';
import Globe from 'react-globe.gl';
import earthTextureUrl from '../assets/earth-texture.jpg';

// Defensive Error Boundary for the Globe
class GlobeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("Globe Crash:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-[2rem] p-6 text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Anteprima 3D non disponibile</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Globe3D = memo(({ itineraries, className }: { itineraries: any[], className?: string }) => {
  const globeEl = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({ 
          w: containerRef.current.clientWidth, 
          h: containerRef.current.clientHeight || 300 
        });
      }
    };
    
    updateSize();
    const obs = new ResizeObserver(updateSize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const points = (itineraries || []).map(it => ({
    lat: Number(it.lat) || 0,
    lng: Number(it.lng) || 0,
    name: it.city,
    color: '#10b981'
  }));

  return (
    <div ref={containerRef} className={className || "w-full h-[300px] relative overflow-hidden bg-transparent"}>
      <GlobeErrorBoundary>
        {size.w > 0 && (
          <Globe
            ref={globeEl}
            width={size.w}
            height={size.h}
            globeImageUrl={earthTextureUrl}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#3b82f6"
            atmosphereAltitude={0.15}
            pointsData={points}
            pointRadius={0.12}
            pointColor="color"
            pointAltitude={0.01}
            pointLabel={(d: any) => `
              <div style="background: rgba(15,15,15,0.9); color: white; padding: 12px 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); font-family: sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="font-weight: 800; font-size: 14px;">${d.name}</div>
                <div style="font-size: 10px; color: #10b981; margin-top: 4px; font-weight: 900; letter-spacing: 0.05em;">TAP PER DETTAGLI</div>
              </div>
            `}
            ringsData={points}
            ringColor={() => '#10b981'}
            ringMaxRadius={2.5}
            ringPropagationSpeed={3}
            ringRepeatPeriod={1000}
            onGlobeReady={() => {
              setReady(true);
              if (globeEl.current) {
                globeEl.current.controls().autoRotate = true;
                globeEl.current.controls().autoRotateSpeed = 0.5;
                globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
              }
            }}
          />
        )}
        
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Inizializzazione 3D...</span>
          </div>
        )}
      </GlobeErrorBoundary>
      
      {/* Visual Polishing */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/50 to-transparent pointer-events-none z-[5]" />
    </div>
  );
});
