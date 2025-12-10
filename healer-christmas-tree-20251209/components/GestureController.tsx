import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { AppState } from '../types';

interface GestureControllerProps {
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  appState: AppState;
}

export const GestureController: React.FC<GestureControllerProps> = ({ setAppState, appState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTime = useRef<number>(-1);
  const lastPredictionTime = useRef<number>(0);
  
  // Timer for "WYX" reveal
  const openHandStartTime = useRef<number>(0);

  // 1. Initialize Camera ASAP
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Lower resolution is fine for gesture detection and faster to process
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 }, 
            height: { ideal: 240 }, 
            facingMode: "user",
            frameRate: { ideal: 30 }
          } 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play();
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera init failed:", err);
        setHasPermission(false);
      }
    };

    initCamera();

    // Cleanup camera on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Initialize AI Model in background
  useEffect(() => {
    let active = true;
    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        if (!active) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });

        if (!active) return;
        landmarkerRef.current = landmarker;
        setIsModelLoading(false);
        
        // Start Loop immediately after model is ready
        predictWebcam();

      } catch (error) {
        console.error("Model init error:", error);
        setIsModelLoading(false); // Stop loading spinner even on error
      }
    };

    initModel();

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const predictWebcam = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();

    // Throttling: Limit detection to approx 24 FPS (~42ms)
    // Slightly smoother than 20FPS but still saves resources
    if (now - lastPredictionTime.current < 42) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }
    lastPredictionTime.current = now;

    if (video && landmarker && video.readyState >= 2) { 
      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        
        try {
          const result = landmarker.detectForVideo(video, now);
          
          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            
            // --- Scale-Invariant Recognition Logic ---
            // 1. Calculate Palm Scale: Distance from Wrist(0) to Middle Finger MCP(9)
            // This allows the gesture to work regardless of how far the user is from the camera.
            const wx = landmarks[0].x;
            const wy = landmarks[0].y;
            const wz = landmarks[0].z;
            
            const mx = landmarks[9].x;
            const my = landmarks[9].y;
            const mz = landmarks[9].z;
            
            const palmScale = Math.sqrt(
                Math.pow(mx - wx, 2) + Math.pow(my - wy, 2) + Math.pow(mz - wz, 2)
            );

            // 2. Calculate Average Tip Distance from Wrist
            const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
            let totalTipDist = 0;
            
            tips.forEach(idx => {
               const tx = landmarks[idx].x;
               const ty = landmarks[idx].y;
               const tz = landmarks[idx].z;
               const dist = Math.sqrt(
                   Math.pow(tx - wx, 2) + Math.pow(ty - wy, 2) + Math.pow(tz - wz, 2)
               );
               totalTipDist += dist;
            });
            const avgTipDist = totalTipDist / tips.length;

            // 3. Calculate Ratio
            // Open Hand: Tips are far extended (Ratio > ~1.7)
            // Fist: Tips are curled in near MCP (Ratio < ~1.2)
            const gestureRatio = avgTipDist / palmScale;

            // Thresholds
            const OPEN_THRESHOLD_RATIO = 1.6;
            const CLOSE_THRESHOLD_RATIO = 1.2;

            if (gestureRatio > OPEN_THRESHOLD_RATIO) {
              // --- OPEN HAND ---
              const timestamp = Date.now();
              
              if (openHandStartTime.current === 0) {
                  openHandStartTime.current = timestamp;
                  setAppState(prev => {
                      if (prev === AppState.SCATTERED || prev === AppState.TEXT_SHAPE) return prev;
                      return AppState.SCATTERED;
                  });
              } else {
                  if (timestamp - openHandStartTime.current > 5000) {
                       setAppState(prev => {
                           if (prev === AppState.TEXT_SHAPE) return prev;
                           return AppState.TEXT_SHAPE;
                       });
                  } else {
                      setAppState(prev => {
                          if (prev === AppState.TEXT_SHAPE) return prev;
                          if (prev === AppState.SCATTERED) return prev;
                          return AppState.SCATTERED;
                      });
                  }
              }
            } else if (gestureRatio < CLOSE_THRESHOLD_RATIO) {
              // --- CLOSED FIST ---
              openHandStartTime.current = 0;
              
              setAppState(prev => {
                  if (prev === AppState.TREE_SHAPE) return prev;
                  return AppState.TREE_SHAPE;
              });
            }
          } else {
              // No hand detected
              openHandStartTime.current = 0;
          }
        } catch (e) {
          console.warn("Detection failed", e);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 opacity-80 hover:opacity-100 transition-opacity">
      <div className="relative rounded-lg overflow-hidden border-2 border-emerald-500/50 shadow-lg shadow-emerald-900/50 w-32 h-24 bg-black">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100" 
        />
        {!hasPermission && !isModelLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-red-400 p-2 bg-black/80">
            Camera Blocked
          </div>
        )}
        {/* Loading Overlay - only shows while model is downloading/init */}
        {isModelLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 flex-col gap-2 backdrop-blur-sm">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">AI Loading</span>
            </div>
        )}
      </div>
    </div>
  );
};