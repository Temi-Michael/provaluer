"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  time: Date;
}

const LAGOS_MOCK_PATH = [
  { lat: 6.428100, lng: 3.421900, accuracy: 3 }, // Point A (Lekki corner 1)
  { lat: 6.428100, lng: 3.422200, accuracy: 2 }, // Point B (Lekki corner 2)
  { lat: 6.427900, lng: 3.422200, accuracy: 3 }, // Point C (Lekki corner 3)
  { lat: 6.427900, lng: 3.421900, accuracy: 2 }, // Point D (Lekki corner 4)
];

export default function MeasurePage() {
  const router = useRouter();

  // Mode & UI States
  const [mode, setMode] = useState<"distance" | "area">("distance");
  const [isViewportSmall, setIsViewportSmall] = useState(false);
  const [isGpsSupported, setIsGpsSupported] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [gpsLocked, setGpsLocked] = useState(false);

  // Position States
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Captured Data States
  const [distPoints, setDistPoints] = useState<GPSPoint[]>([]);
  const [areaPoints, setAreaPoints] = useState<GPSPoint[]>([]);
  const [areaClosed, setAreaClosed] = useState(false);
  const [lastCalculatedArea, setLastCalculatedArea] = useState<number | null>(null);

  // Simulator States
  const [simMode, setSimMode] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Video Element Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Screen/Viewport compatibility check
  useEffect(() => {
    const handleResize = () => {
      setIsViewportSmall(window.innerWidth < 350 || window.innerHeight < 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Geolocation support check
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsGpsSupported("geolocation" in navigator);
    }
  }, []);

  // Camera stream startup
  const startCamera = async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraBlocked(false);
    } catch (err) {
      setCameraBlocked(true);
      setCameraActive(false);
    }
  };

  // GPS Watch startup
  const startGPSWatch = () => {
    if (watchId !== null || typeof window === "undefined" || !("geolocation" in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCurrentAccuracy(pos.coords.accuracy);
        setGpsLocked(true);
      },
      () => {
        setGpsLocked(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    setWatchId(id);
  };

  // Cleanup camera & GPS watch
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Click handler to enable camera & GPS
  const handleEnablePermissions = () => {
    startCamera();
    startGPSWatch();
  };

  // Enable/Disable simulation mode
  const toggleSimulation = () => {
    if (simMode) {
      setSimMode(false);
      setSimStep(0);
      setCurrentPos(null);
      setCurrentAccuracy(null);
      setGpsLocked(false);
      startGPSWatch(); // resume real gps watch
    } else {
      // stop real gps watch
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setSimMode(true);
      setSimStep(0);
      // set to first position
      setCurrentPos({ lat: LAGOS_MOCK_PATH[0].lat, lng: LAGOS_MOCK_PATH[0].lng });
      setCurrentAccuracy(LAGOS_MOCK_PATH[0].accuracy);
      setGpsLocked(true);
    }
  };

  // Walk next step in simulation
  const handleSimStep = () => {
    const nextIdx = (simStep + 1) % LAGOS_MOCK_PATH.length;
    setSimStep(nextIdx);
    setCurrentPos({ lat: LAGOS_MOCK_PATH[nextIdx].lat, lng: LAGOS_MOCK_PATH[nextIdx].lng });
    setCurrentAccuracy(LAGOS_MOCK_PATH[nextIdx].accuracy);
  };

  // Haversine formula
  const haversine = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Capture Point
  const [capturedFlash, setCapturedFlash] = useState(false);
  const handleCapturePoint = () => {
    if (!currentPos) return;

    setCapturedFlash(true);
    setTimeout(() => setCapturedFlash(false), 200);

    const newPoint: GPSPoint = {
      lat: currentPos.lat,
      lng: currentPos.lng,
      accuracy: currentAccuracy ?? 0,
      time: new Date(),
    };

    if (mode === "distance") {
      setDistPoints((prev) => [...prev, newPoint]);
    } else {
      if (areaClosed) {
        setAreaPoints([]);
        setAreaClosed(false);
        setLastCalculatedArea(null);
      }
      setAreaPoints((prev) => [...prev, newPoint]);
    }
  };

  // Undo Point
  const handleUndoPoint = () => {
    if (mode === "distance") {
      setDistPoints((prev) => prev.slice(0, -1));
    } else {
      if (areaClosed) {
        setAreaClosed(false);
        setLastCalculatedArea(null);
      }
      setAreaPoints((prev) => prev.slice(0, -1));
    }
  };

  // Clear All
  const handleClearAll = () => {
    if (mode === "distance") {
      setDistPoints([]);
    } else {
      setAreaPoints([]);
      setAreaClosed(false);
      setLastCalculatedArea(null);
    }
  };

  // Shoelace formula area calculation
  const handleCloseAreaShape = () => {
    const pts = areaPoints;
    if (pts.length < 3) return;

    setAreaClosed(true);

    const R = 6371000;
    const lat0 = (pts[0].lat * Math.PI) / 180;
    const local = pts.map((p) => ({
      x: R * ((p.lng * Math.PI) / 180) * Math.cos(lat0),
      y: R * ((p.lat * Math.PI) / 180),
    }));

    let areaM2 = 0;
    for (let i = 0; i < local.length; i++) {
      const j = (i + 1) % local.length;
      areaM2 += local[i].x * local[j].y;
      areaM2 -= local[j].x * local[i].y;
    }
    areaM2 = Math.abs(areaM2) / 2;
    setLastCalculatedArea(areaM2);
  };

  // Forward to create cost model builder
  const handleUseAreaInCostModel = () => {
    if (lastCalculatedArea === null) return;
    router.push(`/create?type=cost&area=${lastCalculatedArea.toFixed(1)}`);
  };

  // Format metric
  const formatM = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${meters.toFixed(1)} m`;
  };

  // Calculations for display
  const activePoints = mode === "distance" ? distPoints : areaPoints;
  const currentAccuracyVal = currentAccuracy ?? 0;

  // Haversine distance sum
  const getCumulativeDistance = () => {
    let total = 0;
    for (let i = 1; i < distPoints.length; i++) {
      total += haversine(distPoints[i - 1], distPoints[i]);
    }
    return total;
  };

  // Perimeter
  const getAreaPerimeter = () => {
    if (areaPoints.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < areaPoints.length; i++) {
      const j = (i + 1) % areaPoints.length;
      total += haversine(areaPoints[i], areaPoints[j]);
    }
    return total;
  };

  // Dynamic Guideline text based on current lock accuracy
  const getGuidelineMessage = () => {
    if (!gpsLocked || currentAccuracy === null) {
      return "Searching for GPS signal... stand still in an open outdoor area.";
    }
    if (currentAccuracy <= 5) {
      return `🟢 GPS signal is excellent (±${Math.round(currentAccuracy)}m). Walk to the boundary corner and capture.`;
    }
    if (currentAccuracy <= 15) {
      return `🟡 GPS signal is stabilizing (±${Math.round(currentAccuracy)}m). Stand still for a few seconds before capturing.`;
    }
    return `🔴 Poor GPS lock (±${Math.round(currentAccuracy)}m). Step away from high walls, trees, or roofs to clear the sky.`;
  };

  // Block smaller viewports
  if (isViewportSmall) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 text-center bg-background">
        <div className="bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-2xl p-8 max-w-[400px] shadow-lg">
          <div className="text-[40px] mb-4">📱</div>
          <h2 className="text-[20px] font-bold text-black dark:text-white mb-3">Device Screen Too Small</h2>
          <p className="text-[14px] text-gray2 leading-relaxed mb-4">
            PROvaluer boundary measurement tool requires a wider display to align the viewfinder, map, and metrics panel side-by-side.
          </p>
          <p className="text-[13px] font-medium text-blue">
            Please rotate your device to landscape or switch to a larger mobile screen for a better UX.
          </p>
        </div>
      </div>
    );
  }

  // Block devices without GPS hardware
  if (!isGpsSupported) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 text-center bg-background">
        <div className="bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-2xl p-8 max-w-[400px] shadow-lg">
          <div className="text-[40px] mb-4">⚠️</div>
          <h2 className="text-[20px] font-bold text-black dark:text-white mb-3">GPS Hardware Required</h2>
          <p className="text-[14px] text-gray2 leading-relaxed">
            This tool uses native satellite positioning to measure real boundary coordinates as you walk. Please open PROvaluer on a mobile device (smartphone or tablet) equipped with location services.
          </p>
        </div>
      </div>
    );
  }

  // SVG shape mapping renderer
  const renderSVGMap = () => {
    if (areaPoints.length === 0) return null;
    const lat0 = (areaPoints[0].lat * Math.PI) / 180;
    const R = 6371000;
    const local = areaPoints.map((p) => ({
      x: R * ((p.lng * Math.PI) / 180) * Math.cos(lat0),
      y: R * ((p.lat * Math.PI) / 180),
    }));

    let minX = Math.min(...local.map((p) => p.x));
    let maxX = Math.max(...local.map((p) => p.x));
    let minY = Math.min(...local.map((p) => p.y));
    let maxY = Math.max(...local.map((p) => p.y));

    let dx = maxX - minX;
    let dy = maxY - minY;
    const maxDiff = Math.max(dx, dy, 1);

    // Padding
    minX -= maxDiff * 0.15;
    maxX += maxDiff * 0.15;
    minY -= maxDiff * 0.15;
    maxY += maxDiff * 0.15;
    dx = maxX - minX;
    dy = maxY - minY;

    const svgPoints = local.map((p) => {
      const px = ((p.x - minX) / dx) * 200;
      const py = 200 - ((p.y - minY) / dy) * 200;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });

    const pathD = svgPoints.length > 0 ? `M ${svgPoints.join(" L ")} ${areaClosed ? "Z" : ""}` : "";

    return (
      <svg viewBox="0 0 200 200" className="w-full h-[200px] bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden relative">
        <line x1="100" y1="0" x2="100" y2="200" className="stroke-black/5 dark:stroke-white/5 stroke-1" strokeDasharray="4" />
        <line x1="0" y1="100" x2="200" y2="100" className="stroke-black/5 dark:stroke-white/5 stroke-1" strokeDasharray="4" />
        
        {pathD && (
          <path
            d={pathD}
            className="fill-blue/10 stroke-blue stroke-[2.5] stroke-linejoin-round"
          />
        )}
        
        {svgPoints.map((pt, idx) => {
          const [x, y] = pt.split(",");
          const isFirst = idx === 0;
          const isLast = idx === svgPoints.length - 1;
          return (
            <g key={idx}>
              <circle
                cx={x}
                cy={y}
                r={isLast ? "6" : "4.5"}
                className={`${isFirst ? "fill-green" : isLast ? "fill-blue" : "fill-accent"} stroke-white dark:stroke-[#121214] stroke-1.5`}
              />
              <text x={parseFloat(x) + 7} y={parseFloat(y) - 6} className="font-bold text-[9px] fill-gray2 dark:fill-gray1 select-none">
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">Distance &amp; Area Tool</h1>
          <p className="text-[13px] text-gray2 mt-1">Walk property boundaries to capture real coordinates and calculate standard plots.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSimulation}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${
              simMode
                ? "bg-accent/15 text-accent border-accent/25"
                : "bg-surface hover:bg-surface-hover text-black dark:text-white border-black/10 dark:border-white/10"
            }`}
          >
            {simMode ? "🔴 Stop Simulator" : "🛠 Simulate Walk"}
          </button>
        </div>
      </div>

      {/* Toolbar / Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex bg-black/5 dark:bg-[#1a1a1c] rounded-full p-1 border border-black/5 dark:border-white/5">
          <button
            onClick={() => setMode("distance")}
            className={`px-5 py-2 text-[13px] font-semibold rounded-full transition-all ${
              mode === "distance"
                ? "bg-blue text-white shadow-sm"
                : "text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white"
            }`}
          >
            Distance
          </button>
          <button
            onClick={() => setMode("area")}
            className={`px-5 py-2 text-[13px] font-semibold rounded-full transition-all ${
              mode === "area"
                ? "bg-blue text-white shadow-sm"
                : "text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white"
            }`}
          >
            Area Mode
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              gpsLocked
                ? "bg-green/10 text-green border-green/20"
                : "bg-orange/10 text-orange border-orange/20 animate-pulse"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${gpsLocked ? "bg-green" : "bg-orange"}`}></span>
            GPS: {gpsLocked ? "Locked" : "Searching"}
          </span>

          <button onClick={handleUndoPoint} className="px-3.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[12px] font-bold rounded-xl transition-all">
            Undo Point
          </button>
          <button onClick={handleClearAll} className="px-3.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[12px] font-bold rounded-xl transition-all">
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Viewfinder Column */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video lg:h-[480px] w-full border border-black/10 dark:border-white/10">
            {/* Live Camera Video stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: cameraActive ? "block" : "none" }}
            />

            {/* Viewfinder overlay canvases & effects */}
            {capturedFlash && (
              <div className="absolute inset-0 bg-white opacity-40 z-20 pointer-events-none transition-opacity duration-200" />
            )}

            {/* Permission overlay */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-[#1c1c1e] to-black">
                <div className="text-[44px] mb-4">📷</div>
                <h3 className="text-[18px] font-bold text-white mb-2">Camera &amp; GPS Needed</h3>
                <p className="text-[13px] text-gray2 max-w-[340px] leading-relaxed mb-6">
                  PROvaluer uses your live viewport and satellite geolocation coordinates to log boundary lines in the field.
                </p>
                <button
                  onClick={handleEnablePermissions}
                  className="bg-blue hover:bg-[#0070f0] text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg transition-transform hover:scale-102 active:scale-98"
                >
                  Enable Camera &amp; Location
                </button>
                <p className="text-[11px] text-gray3 mt-4">For optimal precision, utilize location services outdoors.</p>
              </div>
            )}

            {/* HUD / Indicators */}
            {cameraActive && (
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none z-10">
                {/* HUD Top Info */}
                <div className="flex justify-between items-center w-full">
                  <span className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-[11px] font-semibold text-white">
                    Accuracy: {currentAccuracy !== null ? `±${Math.round(currentAccuracy)}m` : "Searching"}
                  </span>
                  <span className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-[11px] font-semibold text-white">
                    {activePoints.length} point{activePoints.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* HUD Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-14 h-14">
                  <div className="w-14 h-14 rounded-full border border-white/20 absolute"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white absolute"></div>
                </div>

                {/* HUD Bottom Panel */}
                <div className="mt-auto w-full flex flex-col items-center gap-3">
                  {/* Dynamic Status / Guideline bar */}
                  <div className="bg-black/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-[12px] font-medium text-white max-w-[90%] text-center shadow-lg">
                    {getGuidelineMessage()}
                  </div>

                  {/* Simulator walkthrough steps */}
                  {simMode && (
                    <button
                      onClick={handleSimStep}
                      className="pointer-events-auto bg-green hover:bg-[#25ab47] text-black text-[12px] font-bold px-4 py-2 rounded-xl shadow-lg border border-green/20"
                    >
                      🚶 Walk to Corner {((simStep + 1) % LAGOS_MOCK_PATH.length) + 1}
                    </button>
                  )}

                  {/* Big capture button */}
                  <div className="flex justify-center w-full">
                    <button
                      onClick={handleCapturePoint}
                      className="pointer-events-auto w-16 h-16 rounded-full bg-white border-[4px] border-white/20 active:scale-90 transition-transform flex items-center justify-center shadow-2xl"
                    >
                      <div className="w-11 h-11 rounded-full bg-blue hover:bg-[#0070f0] transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Guidelines Box */}
          {cameraActive && cameraBlocked && (
            <div className="bg-red/10 border border-red/20 text-red text-[13px] px-4 py-3 rounded-xl mt-4">
              Camera stream was blocked. Turn on camera access permissions in your browser configurations to overlay overlays, or proceed with location-only mapping.
            </div>
          )}
        </div>

        {/* Sidebar Metrics Column */}
        <div className="flex flex-col gap-6">
          {/* Main measurements card */}
          <div className="bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-4">Measurement Result</h3>
            
            {mode === "distance" ? (
              <div>
                <div className="mb-6">
                  <div className="text-[36px] font-black text-black dark:text-white leading-none tracking-tight tabular-nums">
                    {formatM(getCumulativeDistance())}
                  </div>
                  <div className="text-[12px] text-gray2 mt-1">Total Path Distance</div>
                </div>

                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {distPoints.length < 2 ? (
                    <p className="text-[13px] text-gray2 italic leading-relaxed py-2">
                      Enable GPS locator, walk boundaries, and capture points to display segments.
                    </p>
                  ) : (
                    distPoints.slice(1).map((pt, idx) => {
                      const prevPt = distPoints[idx];
                      const d = haversine(prevPt, pt);
                      return (
                        <div key={idx} className="flex justify-between items-center text-[13px] border-b border-black/5 dark:border-white/5 py-1.5 last:border-0">
                          <span className="font-semibold text-black dark:text-white">Point {idx + 1} ➔ {idx + 2}</span>
                          <span className="font-medium text-gray2">{formatM(d)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="text-[36px] font-black text-black dark:text-white leading-none tracking-tight tabular-nums">
                    {lastCalculatedArea !== null ? `${lastCalculatedArea.toFixed(1)} m²` : "0.0 m²"}
                  </div>
                  <div className="text-[12px] text-gray2 mt-1">Enclosed Land Area</div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-[13px] border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-gray2">Shape Perimeter</span>
                    <span className="font-semibold text-black dark:text-white">
                      {areaPoints.length >= 3 ? formatM(getAreaPerimeter()) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-gray2">Area (sqft)</span>
                    <span className="font-semibold text-black dark:text-white">
                      {lastCalculatedArea !== null ? `${Math.round(lastCalculatedArea * 10.7639).toLocaleString()} sqft` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] pb-1">
                    <span className="text-gray2">Est. Standard Plots</span>
                    <span className="font-semibold text-blue">
                      {lastCalculatedArea !== null ? `${(lastCalculatedArea / 648).toFixed(2)} plots` : "—"}
                    </span>
                  </div>
                </div>

                {areaPoints.length >= 3 && !areaClosed && (
                  <button
                    onClick={handleCloseAreaShape}
                    className="w-full bg-blue hover:bg-[#0070f0] text-white text-[13px] font-bold py-3 rounded-xl transition-all"
                  >
                    Close Boundary Shape
                  </button>
                )}

                {areaClosed && lastCalculatedArea !== null && (
                  <button
                    onClick={handleUseAreaInCostModel}
                    className="w-full bg-green text-black hover:bg-[#25ab47] text-[13px] font-bold py-3 rounded-xl transition-all"
                  >
                    Use in Cost Model
                  </button>
                )}

                {areaPoints.length < 3 && (
                  <p className="text-[13px] text-gray2 italic leading-relaxed py-2 border-t border-black/5 dark:border-white/5 mt-4">
                    Capture at least 3 corner points to close the polygon and calculate area.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SVG Map Card */}
          {mode === "area" && areaPoints.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-3">Boundary Shape Diagram</h3>
              {renderSVGMap()}
            </div>
          )}

          {/* Points list card */}
          <div className="bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm flex-1">
            <h3 className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-4">Captured Points Logs</h3>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {activePoints.length === 0 ? (
                <p className="text-[13px] text-gray2 italic leading-relaxed py-2">
                  No GPS coordinates captured yet.
                </p>
              ) : (
                activePoints.map((pt, idx) => (
                  <div key={idx} className="bg-black/5 dark:bg-[#232326] border border-black/5 dark:border-white/5 rounded-xl p-3 text-[12px] flex justify-between items-start">
                    <div>
                      <div className="font-bold text-blue">Point {idx + 1}</div>
                      <div className="text-gray2 mt-1 font-mono tracking-tight text-[11px]">
                        {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                      </div>
                    </div>
                    <span className="text-[10px] bg-black/10 dark:bg-white/5 text-gray2 px-2 py-0.5 rounded font-semibold border border-black/5 dark:border-white/5">
                      ±{Math.round(pt.accuracy)}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
