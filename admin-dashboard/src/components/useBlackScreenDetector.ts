'use client';

import { useEffect } from 'react';

export function useBlackScreenDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  url: string,
  onError?: (errorMsg: string) => void
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onError) return;

    let checkInterval: NodeJS.Timeout | null = null;
    let blackFrameCount = 0;
    let loggedWarning = false;

    const checkBlackScreen = () => {
      if (video.paused || video.ended || video.readyState < 2) {
        return;
      }

      // We only start checking after some time has passed to let the video load
      if (video.currentTime <= 1.5) {
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw the current video frame onto the 16x16 canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Check if all pixels are black (or very close to black)
        let isBlack = true;
        let totalLuminance = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          // Standard luminance weights
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += luminance;

          if (luminance > 15) {
            isBlack = false;
          }
        }

        const avgLuminance = totalLuminance / (canvas.width * canvas.height);
        if (avgLuminance < 10) {
          isBlack = true;
        }

        if (isBlack) {
          blackFrameCount++;
          console.warn(`[Black Screen Detector] Black frame detected: count ${blackFrameCount}, avgLuminance ${avgLuminance}`);
          // If we get 4 consecutive black frames (about 4 seconds), trigger error/fallback
          if (blackFrameCount >= 4) {
            console.error(`[Black Screen Detector] 4 consecutive black frames detected for ${url}. Triggering fallback.`);
            onError('Black screen detected: Video playing but screen remains black');
            blackFrameCount = 0;
          }
        } else {
          blackFrameCount = 0;
        }
      } catch (err: any) {
        // Tainted canvas due to CORS. Fail gracefully and disable checking.
        if (!loggedWarning) {
          console.warn(`[Black Screen Detector] Canvas is tainted or CORS is blocked for ${url}. Disabling black screen check.`, err.message);
          loggedWarning = true;
        }
      }
    };

    checkInterval = setInterval(checkBlackScreen, 1000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [videoRef, url, onError]);
}
