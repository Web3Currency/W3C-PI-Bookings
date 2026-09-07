import React, { useEffect, useState } from 'react';
import { appBrandingService } from '../services/appBrandingService';

type PiWatermarkProps = {
  variant?: 'dark-hero' | 'light-hero';
};

const DEFAULT_WATERMARK = '/pi-watermark.svg';

export const PiWatermark: React.FC<PiWatermarkProps> = ({ variant = 'light-hero' }) => {
  const [src, setSrc] = useState(DEFAULT_WATERMARK);

  useEffect(() => {
    let active = true;
    appBrandingService.getPiWatermarkUrl().then((url) => {
      if (active && url) setSrc(url);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const isDark = variant === 'dark-hero';

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute z-0 select-none"
      style={{
        width: 'clamp(220px, 36vw, 400px)',
        height: 'clamp(220px, 36vw, 400px)',
        right: '3%',
        bottom: '3%',
        objectFit: 'contain',
        opacity: isDark ? 0.19 : 0.24,
        filter: isDark ? 'brightness(0) invert(1)' : 'none',
        maskImage: 'radial-gradient(ellipse at 72% 72%, black 0%, black 48%, rgba(0,0,0,.78) 62%, rgba(0,0,0,.36) 78%, transparent 96%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 72% 72%, black 0%, black 48%, rgba(0,0,0,.78) 62%, rgba(0,0,0,.36) 78%, transparent 96%)',
      }}
    />
  );
};
