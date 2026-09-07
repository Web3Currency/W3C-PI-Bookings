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
        width: 'clamp(260px, 46vw, 520px)',
        height: 'clamp(260px, 46vw, 520px)',
        right: '-7%',
        bottom: '-30%',
        objectFit: 'contain',
        opacity: isDark ? 0.105 : 0.14,
        filter: isDark ? 'brightness(0) invert(1)' : 'none',
        maskImage: 'radial-gradient(ellipse at 82% 84%, black 0%, black 28%, rgba(0,0,0,.72) 48%, rgba(0,0,0,.28) 68%, transparent 88%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 82% 84%, black 0%, black 28%, rgba(0,0,0,.72) 48%, rgba(0,0,0,.28) 68%, transparent 88%)',
      }}
    />
  );
};
