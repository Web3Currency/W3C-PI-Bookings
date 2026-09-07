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
        width: 'clamp(260px, 42vw, 460px)',
        height: 'clamp(260px, 42vw, 460px)',
        right: '2%',
        bottom: '2%',
        objectFit: 'contain',
        opacity: isDark ? 0.17 : 0.22,
        filter: isDark ? 'brightness(0) invert(1)' : 'none',
        maskImage: 'radial-gradient(ellipse at 72% 72%, black 0%, black 42%, rgba(0,0,0,.78) 56%, rgba(0,0,0,.38) 72%, transparent 92%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 72% 72%, black 0%, black 42%, rgba(0,0,0,.78) 56%, rgba(0,0,0,.38) 72%, transparent 92%)',
      }}
    />
  );
};
