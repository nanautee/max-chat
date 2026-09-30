'use client';

import { useState } from 'react';
import { avatarColor, initials } from '@/lib/format';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  presenceRingColor?: string;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = 48,
  online = false,
  presenceRingColor,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`${styles.avatar} ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: showImage ? 'var(--bg-surface-alt)' : avatarColor(name || 'max'),
      }}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.image}
          src={src}
          alt=""
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(name)
      )}
      {online ? (
        <span
          className={styles.presence}
          style={{
            width: Math.max(10, Math.round(size * 0.26)),
            height: Math.max(10, Math.round(size * 0.26)),
            borderColor: presenceRingColor ?? 'var(--bg-surface)',
          }}
        />
      ) : null}
    </span>
  );
}