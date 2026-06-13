'use client';

import React, { useEffect, useRef } from 'react';

interface AdsterraAdProps {
  htmlCode: string | null | undefined;
  enabled: boolean;
}

export default function AdsterraAd({ htmlCode, enabled }: AdsterraAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !htmlCode || !containerRef.current) return;

    // Clear previous contents
    containerRef.current.innerHTML = '';

    // Create a temporary element to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlCode;

    // Extract scripts and other elements
    const scripts = tempDiv.getElementsByTagName('script');
    
    // Append non-script elements first
    Array.from(tempDiv.childNodes).forEach((node) => {
      if (node.nodeName !== 'SCRIPT' && containerRef.current) {
        containerRef.current.appendChild(node.cloneNode(true));
      }
    });

    // Execute scripts sequentially by appending them to the DOM
    Array.from(scripts).forEach((script) => {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(script.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy inner script content if inline
      if (script.innerHTML) {
        newScript.innerHTML = script.innerHTML;
      }

      containerRef.current?.appendChild(newScript);
    });

  }, [htmlCode, enabled]);

  if (!enabled || !htmlCode) return null;

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center items-center my-4 overflow-hidden min-h-[50px] w-full" 
    />
  );
}
