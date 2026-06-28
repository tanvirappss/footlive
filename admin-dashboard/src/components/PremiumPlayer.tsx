'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  ChevronUp, 
  Tv, 
  RotateCw,
  RotateCcw,
  Gauge
} from 'lucide-react';

interface PremiumPlayerProps {
  url: string;
  onError?: (errorMsg: string) => void;
  onPlaying?: () => void;
}

function getHumanExplanation(type: string, details: string, statusCode: number | string): string {
  if (type === Hls.ErrorTypes.NETWORK_ERROR) {
    if (statusCode === 0) {
      return 'ডেটাবেস বা স্ট্রিম লিংকটি লোড করতে ব্যর্থ হয়েছে। এটি সাধারণত CORS (Cross-Origin Resource Sharing) পলিসি ব্লকিং বা নেটওয়ার্ক ফায়ারওয়ালের কারণে ঘটে থাকে।';
    }
    if (statusCode === 404) {
      return 'স্ট্রিম সোর্সটি পাওয়া যায়নি (404 Not Found)। লিংকটি হয়তো পরিবর্তন হয়েছে বা লাইভ ব্রডকাস্টটি এখনো শুরু হয়নি।';
    }
    if (statusCode === 403) {
      return 'স্ট্রিম রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে (403 Forbidden)। এপিআই টোকেন মেয়াদোত্তীর্ণ বা এই ডোমেন থেকে রিকোয়েস্ট অনুমোদিত নয়।';
    }
    return `নেটওয়ার্ক ত্রুটি দেখা দিয়েছে (${details})। সার্ভার সংযোগ বিচ্ছিন্ন হতে পারে বা আপনার ইন্টারনেট সংযোগটি চেক করুন।`;
  }
  if (type === Hls.ErrorTypes.MEDIA_ERROR) {
    if (details === 'manifestIncompatibleCodecsError') {
      return 'ব্রাউজারটি এই স্ট্রিমের অডিও/ভিডিও কোডেক সমর্থন করে না। অন্য কোনো প্লেয়ার ট্রাই করুন।';
    }
    return `মিডিয়া প্রসেসিং ত্রুটি (${details})। প্লেয়ারটি এখন স্বয়ংক্রিয়ভাবে বাফার রিকভারি করার চেষ্টা করছে।`;
  }
  if (type === 'NATIVE_SYSTEM_ERROR') {
    if (statusCode === 1) return 'স্ট্রিম ফেচিং অপারেশন ইউজার বা সিস্টেম দ্বারা বাতিল (aborted) হয়েছে।';
    if (statusCode === 2) return 'নেটওয়ার্ক ত্রুটির কারণে স্ট্রিম ডাউনলোড ব্যর্থ হয়েছে। অনুগ্রহ করে ইন্টারনেট চেক করুন।';
    if (statusCode === 3) return 'মিডিয়া ডিকোডিং সমস্যা হয়েছে। স্ট্রিম ফাইলটি হয়তো করাপ্ট বা ব্রাউজারের অযোগ্য।';
    if (statusCode === 4) return 'এই মিডিয়া ফরম্যাট বা কোডেকটি সাফারি ব্রাউজার দ্বারা সমর্থিত নয়।';
  }
  return `অজানা ত্রুটি দেখা দিয়েছে (${details || type})। অনুগ্রহ করে ব্যাকআপ সার্ভার সিলেক্ট করুন।`;
}

export default function PremiumPlayer({ url, onError, onPlaying }: PremiumPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashPlayerRef = useRef<any>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Custom visibility controls state for mobile/touch compatibility
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedMenu(false);
      setShowQualityMenu(false);
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement || !!(document as any).webkitIsFullScreen;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch((err: any) => {
            console.log('Orientation lock failed on fullscreen change:', err);
          });
        }
      } else {
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          try {
            (screen.orientation as any).unlock();
          } catch (e) {}
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const skip = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    let newTime = video.currentTime + amount;
    if (newTime < 0) newTime = 0;
    if (newTime > video.duration) newTime = video.duration;
    
    video.currentTime = newTime;
    resetControlsTimeout();
  };

  // HLS Qualities
  const [qualities, setQualities] = useState<{ id: number; height: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [localError, setLocalError] = useState<{
    type: string;
    details: string;
    statusCode: number | string;
    url: string;
    explanation: string;
    retryCount: number;
  } | null>(null);

  // Load DashJS dynamically if needed
  const loadDashJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).dashjs) {
        resolve((window as any).dashjs);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.1/dash.all.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).dashjs);
      script.onerror = () => reject(new Error('Failed to load Dash.js'));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Browser Capability Diagnostic Logging
    console.log('[Browser Capability Diagnostic]');
    console.log(' - Hls.isSupported():', Hls.isSupported());
    console.log(' - MSE (Media Source Extensions) supported:', typeof window !== 'undefined' && 'MediaSource' in window);
    console.log(' - Native HLS support (application/vnd.apple.mpegurl):', video.canPlayType('application/vnd.apple.mpegurl') || 'no');
    console.log(' - User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');

    // Clean up previous instances
    if (hlsRef.current) {
      console.log('[Stream Lifecycle] Destroying existing HLS.js instance');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashPlayerRef.current) {
      console.log('[Stream Lifecycle] Destroying existing DashJS instance');
      dashPlayerRef.current.destroy();
      dashPlayerRef.current = null;
    }

    setQualities([]);
    setCurrentQuality(-1);
    setIsLiveStream(true);
    setLocalError(null);

    // Cross-origin and compatibility settings on native video
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    const isDASH = url.toLowerCase().includes('.mpd');
    
    // Auto Play helper
    const attemptPlay = (el: HTMLVideoElement) => {
      console.log('[Autoplay Handler] Attempting playback...');
      el.play().catch((err) => {
        console.warn('[Autoplay Handler] Standard autoplay blocked. Muting stream to bypass browser block...', err);
        el.muted = true;
        setIsMuted(true);
        el.play().catch((playErr) => {
          console.error('[Autoplay Handler] Critical: play request failed even when muted:', playErr);
        });
      });
    };

    if (isDASH) {
      console.log(`[Source Manager] Initializing DASH playback for: ${url}`);
      loadDashJs().then((dashjs) => {
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, url, true);
        
        player.updateSettings({
          streaming: {
            lowLatencyEnabled: true,
            liveDelay: 3,
            fastSwitchEnabled: true
          }
        });
        
        dashPlayerRef.current = player;
        
        player.on('playbackStarted', () => {
          console.log('[Stream State Change] DASH playback started');
          setIsPlaying(true);
          setLocalError(null);
          if (onPlaying) onPlaying();
        });
        
        player.on('error', (e: any) => {
          console.error('[DASH Error]', e);
          const errorMsg = `DASH Stream Error: ${e.error ? (e.error.message || e.error) : 'Unknown'}`;
          setLocalError({
            type: 'DASH_PLAYER_ERROR',
            details: errorMsg,
            statusCode: 'DASH_ERR',
            url: url,
            explanation: 'DASH প্লেয়ারটি ভিডিও স্ট্রিম লোড করতে পারছে না। দয়া করে ব্যাকআপ লিংক ট্রাই করুন।',
            retryCount: 1
          });
          if (onError) onError('DASH Stream Error');
        });
      }).catch((err) => {
        console.error('[Source Manager] Failed to load DASH player:', err);
        if (onError) onError('Failed to load DASH player');
      });
    } else if (Hls.isSupported()) {
      console.log(`[Source Manager] Initializing HLS.js playback for: ${url}`);
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 64000,
        fragLoadingMaxRetry: 12,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 64000,
        xhrSetup: function (xhr, requestUrl) {
          xhr.withCredentials = false;
          const lowerReqUrl = requestUrl.toLowerCase();
          if (lowerReqUrl.includes('.m3u8')) {
            console.log(`[Manifest Request] Loading: ${requestUrl}`);
          } else {
            console.log(`[Fragment Request] Loading Segment: ${requestUrl}`);
          }
        }
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      // Subscribe to every HLS event for detailed console logging diagnostics
      Object.keys(Hls.Events).forEach((key) => {
        const eventName = (Hls.Events as any)[key];
        hls.on(eventName, (event: any, data: any) => {
          console.log(`[HLS.js Event] ${eventName}`, data);
        });
      });

      hls.on(Hls.Events.MANIFEST_LOADED, (event: any, data: any) => {
        console.log(`[Manifest Analysis] Levels loaded: ${data.levels?.length || 0}, Live: ${(hls as any).live}`);
        
        let isVodDetected = false;
        // Search raw manifest content for VOD marker
        if (data.networkDetails && typeof data.networkDetails.responseText === 'string') {
          const rawContent = data.networkDetails.responseText;
          if (rawContent.includes('#EXT-X-ENDLIST')) {
            isVodDetected = true;
            console.log('[Manifest Analysis] Detected #EXT-X-ENDLIST. Treating stream as VOD.');
          }
        }
        
        // Auto live/VOD mode switching
        setIsLiveStream(!isVodDetected && (hls as any).live);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
        console.log('[Stream State Change] Manifest parsed successfully.');
        const levels = hls.levels;
        const mappedQualities = levels.map((lvl, idx) => ({
          id: idx,
          height: lvl.height,
          label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`
        }));
        
        const uniqueQualities = mappedQualities.filter(
          (q, i, self) => self.findIndex(t => t.height === q.height) === i
        ).sort((a, b) => b.height - a.height);
        
        setQualities(uniqueQualities);
        attemptPlay(video);
      });

      let mediaRetryCount = 0;
      let networkRetryCount = 0;

      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        const errorType = data.type;
        const errorDetails = data.details;
        const errorFatal = data.fatal;
        const statusCode = data.response?.code || data.response?.status || 'N/A';
        const errorUrl = data.url || data.response?.url || url;

        console.error(`[HLS.js Error Event] Type: ${errorType} | Details: ${errorDetails} | Fatal: ${errorFatal} | Status: ${statusCode} | URL: ${errorUrl}`);

        if (errorFatal) {
          const explanation = getHumanExplanation(errorType, errorDetails, statusCode);
          
          if (errorType === Hls.ErrorTypes.NETWORK_ERROR) {
            networkRetryCount++;
            console.warn(`[Auto Recovery] Attempting network recovery (${networkRetryCount}/3) via hls.startLoad()...`);
            
            setLocalError({
              type: errorType,
              details: errorDetails,
              statusCode: statusCode,
              url: errorUrl,
              explanation: explanation,
              retryCount: networkRetryCount
            });

            if (networkRetryCount <= 3) {
              hls.startLoad();
            } else {
              console.error('[Auto Recovery] Fatal: Network retry limit exceeded.');
              const detailedErrorMsg = `HLS Network Error: ${errorDetails} (Status: ${statusCode}) - Failed URL: ${errorUrl}`;
              if (onError) onError(detailedErrorMsg);
            }
          } else if (errorType === Hls.ErrorTypes.MEDIA_ERROR) {
            mediaRetryCount++;
            console.warn(`[Auto Recovery] Attempting media recovery (${mediaRetryCount}/3) via hls.recoverMediaError()...`);
            
            setLocalError({
              type: errorType,
              details: errorDetails,
              statusCode: statusCode,
              url: errorUrl,
              explanation: explanation,
              retryCount: mediaRetryCount
            });

            if (mediaRetryCount <= 3) {
              hls.recoverMediaError();
            } else {
              console.warn('[Auto Recovery] Media recovery exhausted. Attempting codec-swap fallback...');
              try {
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } catch (e) {
                console.error('[Auto Recovery] Hard recovery failed. Destroying instance.');
                hls.destroy();
                const detailedErrorMsg = `Fatal Media Error: ${errorDetails} - Failed URL: ${errorUrl}`;
                if (onError) onError(detailedErrorMsg);
              }
            }
          } else {
            console.error('[Auto Recovery] Fatal non-recoverable error.');
            hls.destroy();
            const detailedErrorMsg = `Fatal Playback Error: ${errorDetails} (${errorType}) - Failed URL: ${errorUrl}`;
            if (onError) onError(detailedErrorMsg);
          }
        } else {
          console.log(`[HLS.js Warning] Non-fatal issue: ${errorDetails}`);
        }
      });

      // Clear recovery errors once successfully playing
      const onPlayingReset = () => {
        console.log('[Stream State Change] Stream is playing. Resetting error states and recovery counts.');
        setLocalError(null);
        mediaRetryCount = 0;
        networkRetryCount = 0;
      };
      video.addEventListener('playing', onPlayingReset);
      (video as any).__hlsPlayResetListener = onPlayingReset;
      
      attemptPlay(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log(`[Source Manager] Fallback to Safari native HLS playback for: ${url}`);
      video.src = url;
      
      let nativeRetryCount = 0;

      const handleNativeError = (e: Event) => {
        const error = video.error;
        const code = error ? error.code : 'unknown';
        const msg = error ? error.message : 'Unknown Native Error';
        console.error(`[Safari Native Error] Code: ${code} | Message: ${msg}`);

        nativeRetryCount++;
        const explanation = getHumanExplanation('NATIVE_SYSTEM_ERROR', msg, code);

        setLocalError({
          type: 'SAFARI_NATIVE_ERROR',
          details: msg,
          statusCode: code,
          url: url,
          explanation: explanation,
          retryCount: nativeRetryCount
        });

        if (nativeRetryCount <= 3) {
          console.log(`[Native Recovery] Reloading Safari stream source in 2s (Attempt ${nativeRetryCount}/3)...`);
          setTimeout(() => {
            video.load();
            attemptPlay(video);
          }, 2000);
        } else {
          console.error('[Native Recovery] Retries exhausted.');
          if (onError) {
            onError(`Safari Native Error (Code ${code}): ${msg}`);
          }
        }
      };

      video.addEventListener('error', handleNativeError);
      (video as any).__nativeErrorListener = handleNativeError;

      const handleMetadata = () => {
        console.log(`[Metadata Analysis] Loaded metadata. Duration: ${video.duration}`);
        if (video.duration && video.duration !== Infinity) {
          console.log('[Metadata Analysis] Duration is finite. Native stream is VOD.');
          setIsLiveStream(false);
        } else {
          setIsLiveStream(true);
        }
      };
      video.addEventListener('loadedmetadata', handleMetadata);
      (video as any).__nativeMetadataListener = handleMetadata;

      attemptPlay(video);
    }

    // Video Stall Recovery & Buffering Diagnostics
    let stallCount = 0;
    const handleWaiting = () => {
      console.log('[Stream State Change] Stream is buffering / waiting...');
      
      if (video.buffered && video.buffered.length > 0) {
        const currentTime = video.currentTime;
        for (let i = 0; i < video.buffered.length; i++) {
          const start = video.buffered.start(i);
          const end = video.buffered.end(i);
          
          if (currentTime >= start && currentTime < end && (end - currentTime) < 0.5) {
            stallCount++;
            if (stallCount >= 3) {
              console.warn('[Buffer Recovery] Stalled near segment end. Nudging playhead +0.2s to force buffer load.');
              video.currentTime = Math.min(video.duration, video.currentTime + 0.2);
              stallCount = 0;
            }
            break;
          }
        }
      }
    };
    video.addEventListener('waiting', handleWaiting);
    (video as any).__waitingStallListener = handleWaiting;

    return () => {
      console.log('[Stream Lifecycle] Cleaning up player effect...');
      
      if ((video as any).__hlsPlayResetListener) {
        video.removeEventListener('playing', (video as any).__hlsPlayResetListener);
      }
      if ((video as any).__nativeErrorListener) {
        video.removeEventListener('error', (video as any).__nativeErrorListener);
      }
      if ((video as any).__nativeMetadataListener) {
        video.removeEventListener('loadedmetadata', (video as any).__nativeMetadataListener);
      }
      if ((video as any).__waitingStallListener) {
        video.removeEventListener('waiting', (video as any).__waitingStallListener);
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashPlayerRef.current) {
        dashPlayerRef.current.destroy();
        dashPlayerRef.current = null;
      }
    };
  }, [url]);

  // Track playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      console.log('[Stream State Change] Video play event triggered');
      setIsPlaying(true);
    };
    const onPause = () => {
      console.log('[Stream State Change] Video pause event triggered');
      setIsPlaying(false);
    };
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  // Time update for loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let playTimeout = setTimeout(() => {
      if (video.currentTime === 0 && !isMuted && !localError) {
        console.warn('[Stream Buffer Timeout] No segments played within 8.5 seconds. Reporting timeout.');
        if (onError) onError('Stream buffer timeout');
      }
    }, 8500);

    const handlePlaying = () => {
      clearTimeout(playTimeout);
      if (onPlaying) onPlaying();
    };

    video.addEventListener('playing', handlePlaying);

    return () => {
      clearTimeout(playTimeout);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [url, localError]);

  // Controls Actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    video.muted = val === 0;
    setIsMuted(val === 0);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (qualityId: number) => {
    if (hlsRef.current) {
      console.log(`[Source Switch] Manually changing HLS quality/level to: ${qualityId === -1 ? 'Auto' : qualities.find(q => q.id === qualityId)?.label || qualityId}`);
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);
    }
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
      }
      return;
    }

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      }).catch((err) => {
        if (video.requestFullscreen) {
          video.requestFullscreen().then(() => {
            if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
              (screen.orientation as any).lock('landscape').catch(() => {});
            }
          });
        } else if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
      });
    } else {
      if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video !== document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black relative flex items-center justify-center rounded-2xl overflow-hidden border border-card-border group"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
          resetControlsTimeout();
        }}
      />

      {localError && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col justify-center p-6 text-xs text-left overflow-y-auto space-y-3 z-50">
          <div className="flex items-center gap-2 text-red-500 font-extrabold uppercase tracking-widest text-[10px]">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            Playback Diagnostics Engine
          </div>
          
          <div className="space-y-1.5 border-t border-slate-900 pt-3 text-[10.5px]">
            <div className="flex gap-2">
              <span className="text-slate-500 font-black uppercase w-24 shrink-0">Error Type:</span>
              <span className="text-white font-mono">{localError.type}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 font-black uppercase w-24 shrink-0">Details:</span>
              <span className="text-white font-mono break-all">{localError.details}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 font-black uppercase w-24 shrink-0">HTTP Code:</span>
              <span className="text-amber-500 font-mono font-black">{localError.statusCode}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 font-black uppercase w-24 shrink-0">Failed URL:</span>
              <span className="text-slate-400 font-mono break-all text-[9.5px] select-all">{localError.url}</span>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-3 text-xs text-slate-300 font-medium leading-relaxed font-bangla">
            {localError.explanation}
          </div>

          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest pt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Attempting automated recovery ({localError.retryCount}/3)...
          </div>
        </div>
      )}

      {/* Floating Fullscreen Toggle Button (extremely visible & accessible on mobile) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
          resetControlsTimeout();
        }}
        className={`absolute top-4 right-4 p-2.5 bg-black/60 hover:bg-slate-900 border border-slate-700/60 rounded-xl transition-all duration-300 z-40 cursor-pointer ${
          showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        title="Fullscreen Toggle"
      >
        {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
      </button>

      {/* Premium Glassmorphic Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 flex flex-col gap-3 z-30 select-none ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        
        {/* Controls Row */}
        <div className="flex items-center justify-between gap-1 sm:gap-4 flex-nowrap w-full">
          
          {/* Left Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap">
            {/* 10s Backward */}
            <button 
              onClick={(e) => { e.stopPropagation(); skip(-10); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center justify-center relative"
              title="Backward 10s"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="absolute text-[8px] font-black top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[1px]">10</span>
            </button>
 
            {/* Play/Pause */}
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white hover:fill-emerald-accent" />}
            </button>
 
            {/* 10s Forward */}
            <button 
              onClick={(e) => { e.stopPropagation(); skip(10); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center justify-center relative"
              title="Forward 10s"
            >
              <RotateCw className="h-5 w-5" />
              <span className="absolute text-[8px] font-black top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[1px]">10</span>
            </button>
 
            {/* Mute/Volume */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
                className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              {/* Hide range slider on mobile to prevent overflow (mobile users use physical keys) */}
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => { e.stopPropagation(); handleVolumeChange(e); }}
                className="hidden sm:block w-14 sm:w-16 h-1 rounded-lg appearance-none bg-slate-800 accent-emerald-accent cursor-pointer overflow-hidden"
              />
            </div>
            
            {/* Live Badge */}
            {isLiveStream && (
              <span className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            )}
          </div>
 
          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-3.5 flex-nowrap">
            
            {/* PiP */}
            <button 
              onClick={(e) => { e.stopPropagation(); handlePiP(); }}
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <Tv className="h-5 w-5" />
            </button>
 
            {/* Quality Selector (HLS only) */}
            {qualities.length > 0 && (
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className={`text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-black uppercase tracking-wider ${showQualityMenu ? 'text-emerald-accent' : ''}`}
                  title="Video Quality"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {currentQuality === -1 ? 'Auto' : qualities.find(q => q.id === currentQuality)?.label}
                  </span>
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 py-1.5 w-32 bg-slate-950/90 border border-card-border rounded-xl backdrop-blur-xl shadow-2xl flex flex-col z-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleQualityChange(-1); }}
                      className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${currentQuality === -1 ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button 
                        key={q.id}
                        onClick={(e) => { e.stopPropagation(); handleQualityChange(q.id); }}
                        className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${currentQuality === q.id ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
 
            {/* Playback Speed */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className={`text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-black uppercase tracking-wider ${showSpeedMenu ? 'text-emerald-accent' : ''}`}
                title="Playback Speed"
              >
                <Gauge className="h-5 w-5" />
                <span className="hidden sm:inline">{playbackSpeed}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 w-28 bg-slate-950/90 border border-card-border rounded-xl backdrop-blur-xl shadow-2xl flex flex-col z-50">
                  {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                    <button 
                      key={sp}
                      onClick={(e) => { e.stopPropagation(); handleSpeedChange(sp); }}
                      className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${playbackSpeed === sp ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                    >
                      {sp === 1 ? 'Normal' : `${sp}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
 
            {/* Fullscreen */}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
 
        </div>
 
      </div>
    </div>
  );
}
