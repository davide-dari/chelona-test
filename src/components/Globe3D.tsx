import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import earthTextureUrl from '../assets/earth-texture.jpg';

export const Globe3D = ({ itineraries, className }: { itineraries: any[], className?: string }) => {
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

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
    
    // Use ResizeObserver for more reliable sizing
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      // Auto-rotate settings
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.8;
      
      // Better starting point
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1000);
    }
  }, []);

  const pointsData = (itineraries || []).map(it => ({
    lat: Number(it.lat) || 0,
    lng: Number(it.lng) || 0,
    name: it.city,
    color: '#10b981' // emerald-500
  }));

  return (
    <div ref={containerRef} className={className || "w-full h-[300px] sm:h-[400px] relative overflow-hidden"}>
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={earthTextureUrl}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
        
        // Points
        pointsData={pointsData}
        pointRadius={0.08}
        pointColor="color"
        pointAltitude={0.01}
        pointsMerge={false}
        pointLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(8px);">
            <b style="font-size: 14px; font-family: sans-serif;">${d.name}</b>
          </div>
        `}

        // Rings for a pulse effect
        ringsData={pointsData}
        ringColor={() => '#10b981'}
        ringMaxRadius={2}
        ringPropagationSpeed={3}
        ringRepeatPeriod={1000}
      />
      
      {/* Gradient overlay to blend with background */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />
    </div>
  );
};
