import React, { useState, useEffect } from 'react';

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  fallbackSrc,
  alt = 'Document Photo',
  className = '',
  ...props
}) => {
  const [displaySrc, setDisplaySrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!src) {
      setDisplaySrc('');
      setLoading(false);
      return;
    }

    // Direct display for data URIs, blob URLs, and static public assets
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/assets/')) {
      setDisplaySrc(src);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let objectUrl = '';

    const loadImage = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('bg_auth_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(src, { headers });
        if (!res.ok) {
          throw new Error(`Failed to load image: ${res.status}`);
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setDisplaySrc(objectUrl);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setDisplaySrc(fallbackSrc || '');
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, fallbackSrc]);

  if (!displaySrc) {
    return (
      <div className={`flex items-center justify-center bg-slate-900/[0.04] text-slate-400 text-xs ${className}`}>
        {loading ? 'Loading image...' : alt}
      </div>
    );
  }

  return <img src={displaySrc} alt={alt} className={className} {...props} />;
};
