import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';

// ─── Terrain Generation ─────────────────────────────────────────────────────
// Same elevation model as the launch screen (Reykjanes peninsula, Iceland).

const COLS = 30;
const ROWS = 46;

function buildElevationGrid(): number[] {
  function gauss(
    nx: number, ny: number,
    cx: number, cy: number,
    sx: number, sy: number,
    h: number,
  ) {
    return h * Math.exp(-(
      Math.pow(nx - cx, 2) / (2 * sx * sx) +
      Math.pow(ny - cy, 2) / (2 * sy * sy)
    ));
  }

  function ridge(
    nx: number, ny: number,
    x1: number, y1: number,
    x2: number, y2: number,
    w: number, h: number,
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((nx - x1) * dx + (ny - y1) * dy) / len2));
    const d = Math.sqrt(Math.pow(nx - x1 - t * dx, 2) + Math.pow(ny - y1 - t * dy, 2));
    return h * Math.exp(-(d * d) / (2 * w * w));
  }

  const grid: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nx = c / (COLS - 1);
      const ny = r / (ROWS - 1);
      let v = 18;
      v += ridge(nx, ny, 0.05, 0.99, 0.82, 0.02, 0.068, 340);
      v += ridge(nx, ny, 0.30, 0.99, 0.98, 0.20, 0.052, 180);
      v += gauss(nx, ny, 0.51, 0.25, 0.028, 0.028, 380);
      v += gauss(nx, ny, 0.45, 0.45, 0.058, 0.042, 285);
      v += gauss(nx, ny, 0.96, 0.08, 0.075, 0.060, 720);
      v += gauss(nx, ny, 0.93, 0.05, 0.068, 0.052, 880);
      v += gauss(nx, ny, 0.18, 0.12, 0.120, 0.080, 210);
      v -= gauss(nx, ny, 0.14, 0.72, 0.11, 0.10, 110);
      const n1 = Math.sin(nx * 13.1 + 2.3) * Math.cos(ny * 9.4 + 1.1) * 40;
      const n2 = Math.sin(nx * 27.3 + 0.7) * Math.cos(ny * 21.8 + 3.4) * 14;
      const n3 = Math.sin(nx * 5.2 + ny * 7.1 + 0.9) * 22;
      v += n1 + n2 + n3;
      grid.push(Math.max(0, v));
    }
  }
  return grid;
}

// ─── Marching Squares ───────────────────────────────────────────────────────

interface Seg { x1: number; y1: number; x2: number; y2: number }

function marchingSquares(grid: number[], cols: number, rows: number, threshold: number): Seg[] {
  function interp(v1: number, v2: number) {
    const d = v2 - v1;
    return Math.abs(d) < 1e-9 ? 0.5 : Math.max(0, Math.min(1, (threshold - v1) / d));
  }

  const segs: Seg[] = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const tl = grid[row * cols + col];
      const tr = grid[row * cols + col + 1];
      const bl = grid[(row + 1) * cols + col];
      const br = grid[(row + 1) * cols + col + 1];
      const idx =
        (tl >= threshold ? 8 : 0) |
        (tr >= threshold ? 4 : 0) |
        (br >= threshold ? 2 : 0) |
        (bl >= threshold ? 1 : 0);
      if (idx === 0 || idx === 15) continue;

      const top    = { x: col + interp(tl, tr), y: row };
      const right  = { x: col + 1, y: row + interp(tr, br) };
      const bottom = { x: col + interp(bl, br), y: row + 1 };
      const left   = { x: col, y: row + interp(tl, bl) };

      const lut: Record<number, { x: number; y: number }[] | undefined> = {
        1: [left, bottom], 2: [bottom, right], 3: [left, right],
        4: [top, right], 6: [top, bottom], 7: [top, left],
        8: [top, left], 9: [top, bottom], 11: [top, right],
        12: [left, right], 13: [bottom, right], 14: [left, bottom],
        5: [top, right, left, bottom],
        10: [left, bottom, top, right],
      };
      const p = lut[idx];
      if (!p) continue;
      if (p.length === 2) {
        segs.push({ x1: p[0].x, y1: p[0].y, x2: p[1].x, y2: p[1].y });
      } else {
        segs.push({ x1: p[0].x, y1: p[0].y, x2: p[1].x, y2: p[1].y });
        segs.push({ x1: p[2].x, y1: p[2].y, x2: p[3].x, y2: p[3].y });
      }
    }
  }
  return segs;
}

// ─── Contour Paths ──────────────────────────────────────────────────────────

interface ContourLevel {
  d: string;
  opacity: number;
  strokeWidth: number;
}

function buildContourPaths(W: number, H: number, isDark: boolean): ContourLevel[] {
  const elevGrid = buildElevationGrid();
  const land = elevGrid.filter(v => v > 2);
  if (land.length === 0) return [];

  const minE = Math.min(...land);
  const maxE = Math.max(...land);

  const interval = Math.max(15, Math.round((maxE - minE) / 28));
  const firstLevel = Math.ceil(minE / interval) * interval;
  const levels: number[] = [];
  for (let lv = firstLevel; lv <= maxE; lv += interval) levels.push(lv);

  const nLevels = levels.length;

  function toScreen(gx: number, gy: number) {
    return {
      sx: (gx / (COLS - 1)) * W,
      sy: (gy / (ROWS - 1)) * H,
    };
  }

  return levels.map((threshold, i) => {
    const t = i / Math.max(1, nLevels - 1);
    const isIndex = (Math.round((threshold - firstLevel) / interval) % 5 === 0);
    const baseOpacity = isIndex ? 0.32 + t * 0.28 : 0.10 + t * 0.20;
    // Dark mode: scale down to ~18% max to match web's subtle copper look
    const opacity = isDark ? baseOpacity * 0.5 : baseOpacity;
    const sw = isIndex ? 0.80 + t * 0.30 : 0.22 + t * 0.28;

    const segs = marchingSquares(elevGrid, COLS, ROWS, threshold);
    const parts = segs.map(s => {
      const a = toScreen(s.x1, s.y1);
      const b = toScreen(s.x2, s.y2);
      return `M${a.sx.toFixed(1)},${a.sy.toFixed(1)}L${b.sx.toFixed(1)},${b.sy.toFixed(1)}`;
    });

    return { d: parts.join(''), opacity, strokeWidth: sw };
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TopoBackgroundProps {
  /** Vertical offset so contours start below the header bar */
  topOffset?: number;
}

/**
 * Procedurally-generated topographic contour-line background.
 * Same terrain model as the launch screen. Uses gray strokes for subtlety.
 * Absolutely-positioned below the given topOffset, pointer-events disabled.
 */
export function TopoBackground({ topOffset = 0 }: TopoBackgroundProps) {
  const { dark } = useTheme();
  const { width, height } = useWindowDimensions();

  const drawHeight = height - topOffset;
  const contours = useMemo(
    () => buildContourPaths(width, drawHeight, dark),
    [width, drawHeight, dark],
  );

  const strokeColor = dark ? '#ac6d46' : '#b5bcc4';

  return (
    <View
      style={[StyleSheet.absoluteFillObject, { top: topOffset }]}
      pointerEvents="none"
    >
      <Svg width={width} height={drawHeight}>
        {contours.map((level, i) => (
          <Path
            key={`c-${i}`}
            d={level.d}
            stroke={strokeColor}
            strokeWidth={level.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={level.opacity}
          />
        ))}
      </Svg>
    </View>
  );
}
