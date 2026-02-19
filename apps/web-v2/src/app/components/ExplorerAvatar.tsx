'use client';

import Image from 'next/image';
import { useState } from 'react';

const PALETTE = [
  '#4676ac', '#ac6d46', '#6b5c4e', '#5a7a5a',
  '#8b6b8b', '#7a6b5a', '#5b7a8b', '#8b7a5b',
];

function hashUsername(username: string): number {
  let sum = 0;
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i);
  }
  return sum % PALETTE.length;
}

function getInitials(username: string): string {
  if (!username) return '?';
  // Check for multi-word (space/hyphen/underscore separated)
  const parts = username.split(/[\s\-_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Check for camelCase
  const camelParts = username.split(/(?=[A-Z])/).filter(Boolean);
  if (camelParts.length >= 2) {
    return (camelParts[0][0] + camelParts[1][0]).toUpperCase();
  }
  // Single word
  return username[0].toUpperCase();
}

interface ExplorerAvatarProps {
  username: string;
  src?: string | null;
  size: number;
  className?: string;
}

export function ExplorerAvatar({ username, src, size, className = '' }: ExplorerAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const bgColor = PALETTE[hashUsername(username)];
  const initials = getInitials(username);
  const fontSize = size < 48 ? size * 0.45 : size * 0.35;

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={username}
        className={`object-cover ${className}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-bold font-mono text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize }}
    >
      {initials}
    </div>
  );
}
