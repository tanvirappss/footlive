'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  url: string;
  onError?: (errorMsg: string) => void;
  onPlaying?: () => void;
}

export default function HlsPlayer({ url, onError, onPlaying }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance if it exists
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
        // High resilience settings for unstable mobile connections & WebViews
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1500,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1500,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
        // Bypass credential-restricted CORS blocks on open streams
        xhrSetup: function (xhr) {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data.type, data.details);
          
          // Attempt recovery
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, attempting startLoad recovery...');
              hls.startLoad();
              if (onError) {
                onError(`HLS Network Error: ${data.details}`);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, attempting recoverMediaError recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal unrecoverable error, destroying HLS instance...');
              hls.destroy();
              if (onError) {
                onError(`HLS Fatal Error: ${data.details}`);
              }
              break;
          }
        } else {
          // Recover from non-fatal errors such as initial manifestLoadError
          if (data.details === 'manifestLoadError') {
            console.log('Retrying manifest load on manifestLoadError...');
            hls.loadSource(url);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback for native Safari / iOS HLS player
      video.src = url;
      video.addEventListener('error', (e) => {
        if (onError) {
          onError('Native browser video loading failed');
        }
      });
    } else {
      if (onError) {
        onError('HLS stream playback is not supported by your browser.');
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let playTimeoutId: NodeJS.Timeout | null = null;
    let hasStarted = false;

    const onTimeUpdate = () => {
      if (video.currentTime > 0 && !hasStarted) {
        hasStarted = true;
        if (onPlaying) {
          onPlaying();
        }
        if (playTimeoutId) {
          clearTimeout(playTimeoutId);
          playTimeoutId = null;
        }
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);

    // Set a 3-second playback check timeout
    playTimeoutId = setTimeout(() => {
      if (!hasStarted) {
        console.warn(`HlsPlayer: Playback failed to start within 3s for ${url}. Triggering fallback.`);
        if (onError) {
          onError('Playback timeout: stream failed to play within 3 seconds');
        }
      }
    }, 3000);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (playTimeoutId) {
        clearTimeout(playTimeoutId);
      }
    };
  }, [url, onError]);

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center rounded-2xl overflow-hidden border border-card-border">
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain focus:outline-none"
      />
    </div>
  );
}
