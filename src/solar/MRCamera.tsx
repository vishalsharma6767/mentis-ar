// Mixed-reality camera passthrough + MediaPipe hand tracking.
//
// Renders the phone's rear camera as a full-screen background behind the
// transparent R3F canvas, and runs MediaPipe HandLandmarker on the same feed
// to drive the "grab / drag / rotate by hand" interaction in solarState.
//
// Hand tracking works with the phone OUT of the headset (camera sees the hand)
// as well as in-headset when the user raises a hand into the camera's view.

import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { solarState } from './solarState';

let handLandmarker: HandLandmarker | null = null;
let landmarkerPromise: Promise<HandLandmarker | null> | null = null;

async function getHandLandmarker(): Promise<HandLandmarker | null> {
  if (handLandmarker) return handLandmarker;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    try {
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      handLandmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      return handLandmarker;
    } catch (err) {
      console.warn('HandLandmarker failed to load (falling back to gaze+voice):', err);
      return null;
    }
  })();
  return landmarkerPromise;
}

export function HandTracker({ video }: { video: HTMLVideoElement | null }) {
  const raf = useRef(0);
  const lastVideoTime = useRef(-1);

  useEffect(() => {
    if (!video) return;

    let cancelled = false;
    let lm: HandLandmarker | null = null;

    const loop = () => {
      if (cancelled) return;
      raf.current = requestAnimationFrame(loop);
      if (!lm || !video || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime.current) return;
      lastVideoTime.current = video.currentTime;

      const now = performance.now();
      let result;
      try {
        result = lm.detectForVideo(video, now);
      } catch {
        return;
      }

      const hand = solarState.hand;
      const hands = result.landmarks || [];

      if (hands.length === 0) {
        hand.active = false;
        hand.pinch = false;
        return;
      }

      // Use the first (largest / primary) hand for the pointer.
      const h = hands[0];
      const indexTip = h[8];
      const thumbTip = h[4];
      const wrist = h[0];

      // Normalized device coords for the index fingertip (y is up).
      hand.x = indexTip.x * 2 - 1;
      hand.y = -(indexTip.y * 2 - 1);
      hand.active = true;

      // Pinch: distance between thumb tip and index tip in normalized space.
      const dx = indexTip.x - thumbTip.x;
      const dy = indexTip.y - thumbTip.y;
      const dist = Math.hypot(dx, dy);
      const pinch = dist < 0.055;

      // Debounce: require the pinch to stay stable across a couple of frames so
      // casual hand moves don't grab a planet.
      if (pinch) {
        hand.pinchStrength = Math.min(1, hand.pinchStrength + 0.25);
      } else {
        hand.pinchStrength = Math.max(0, hand.pinchStrength - 0.2);
      }
      hand.pinch = hand.pinchStrength >= 0.6;

      // (wrist used by future rotate gesture — keep referenced)
      void wrist;
    };

    (async () => {
      lm = await getHandLandmarker();
      if (cancelled) return;
      loop();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf.current);
    };
  }, [video]);

  return null;
}

// Full-screen rear-camera video that sits BEHIND the transparent canvas.
export function MRCamera({
  enabled,
  onReady,
}: {
  enabled: boolean;
  onReady?: (video: HTMLVideoElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // stop the stream when MR is disabled
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      solarState.cameraOn = false;
      solarState.mode = 'space';
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        solarState.cameraOn = true;
        solarState.mode = 'camera';
        solarState.cameraError = null;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
          onReady?.(videoRef.current);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.warn('Camera unavailable, using space mode:', err);
        setError(err?.name || 'camera-unavailable');
        solarState.cameraError = err?.name || 'camera-unavailable';
        solarState.cameraOn = false;
        solarState.mode = 'space';
      }
    };
    start();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Ensure the video keeps playing once the stream is attached.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Hand tracker reads the same video element.
  const videoEl = videoRef.current;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.9)' }}
      />
      {error && (
        <div className="absolute inset-x-0 bottom-20 mx-auto w-max px-4 py-2 rounded-xl bg-slate-900/85 border border-amber-500/40 text-amber-300 text-[11px] font-bold backdrop-blur">
          Camera unavailable — showing space mode. ({error})
        </div>
      )}
      <HandTracker video={videoEl} />
    </div>
  );
}
