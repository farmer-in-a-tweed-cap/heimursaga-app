import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  LogBox,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Text as SvgText,
} from 'react-native-svg';

import { StripeProvider } from '@stripe/stripe-react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { initAnalytics, analytics } from '@/services/analytics';
import {
  registerForPushNotifications,
  sendPushTokenToServer,
  removePushTokenFromServer,
} from '@/services/pushNotifications';
import * as Notifications from 'expo-notifications';
import { mono, colors as brandColors } from '@/theme/tokens';

// Keep the native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

// Suppress known non-fatal @rnmapbox/maps error on React Native New Architecture.
// The Mapbox SDK internally references views by legacy reactTag which Fabric
// doesn't support. The map still renders correctly — this just silences the noise.
LogBox.ignoreLogs(['Unknown reactTag']);

// ─── Terrain Generation ─────────────────────────────────────────────────────

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
      // SW–NE Reykjanes lava ridge
      v += ridge(nx, ny, 0.05, 0.99, 0.82, 0.02, 0.068, 340);
      // Secondary parallel ridge
      v += ridge(nx, ny, 0.30, 0.99, 0.98, 0.20, 0.052, 180);
      // Keilir
      v += gauss(nx, ny, 0.51, 0.25, 0.028, 0.028, 380);
      // Fagradalsfjall
      v += gauss(nx, ny, 0.45, 0.45, 0.058, 0.042, 285);
      // Hengill
      v += gauss(nx, ny, 0.96, 0.08, 0.075, 0.060, 720);
      // Esja
      v += gauss(nx, ny, 0.93, 0.05, 0.068, 0.052, 880);
      // Broad western highland
      v += gauss(nx, ny, 0.18, 0.12, 0.120, 0.080, 210);
      // Lava flat suppress
      v -= gauss(nx, ny, 0.14, 0.72, 0.11, 0.10, 110);
      // Micro terrain
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

// ─── Topographic Contours ───────────────────────────────────────────────────

interface ContourLevel {
  d: string;
  opacity: number;
  strokeWidth: number;
}

function buildContourPaths(W: number, H: number): ContourLevel[] {
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
    const opacity = isIndex ? 0.32 + t * 0.28 : 0.10 + t * 0.20;
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

function TopoContours() {
  const { width, height } = useWindowDimensions();

  const contours = useMemo(() => buildContourPaths(width, height), [width, height]);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
    >
      {contours.map((level, i) => (
        <Path
          key={`contour-${i}`}
          d={level.d}
          stroke={brandColors.copper}
          strokeWidth={level.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={level.opacity}
        />
      ))}
      <SvgText
        x={22}
        y={height * 0.18}
        fill={brandColors.copper}
        opacity={0.28}
        fontSize={9.5}
        fontFamily={mono}
        letterSpacing={1.2}
      >
        63.88°N  ·  22.41°W
      </SvgText>
    </Svg>
  );
}

// ─── Vignette Overlay ───────────────────────────────────────────────────────

function Vignette() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <RadialGradient
          id="vig"
          cx={width / 2}
          cy={height / 2}
          rx={width * 0.75}
          ry={height * 0.6}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.2" stopColor="#0e0b08" stopOpacity={0} />
          <Stop offset="0.6" stopColor="#0e0b08" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#080604" stopOpacity={0.95} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#vig)" />
    </Svg>
  );
}

// ─── Lexicon Entries ────────────────────────────────────────────────────────

const LEXICON = [
  { word: 'Explorer',   def: 'n. L. explorare — to call out into the unknown.' },
  { word: 'Expedition', def: 'n. L. expedire — to free the feet.' },
  { word: 'Journal',    def: 'n. L. diurnalis — a record of days.' },
];

// ─── Loading Bar ────────────────────────────────────────────────────────────

function LoadingBar() {
  const slideAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, [slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-48, 120],
  });

  return (
    <View style={launchStyles.barTrack}>
      <Animated.View
        style={{
          width: 48,
          height: 2,
          backgroundColor: brandColors.copper,
          opacity: 0.35,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

// ─── Launch Screen ──────────────────────────────────────────────────────────

function LaunchScreen() {
  const riseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide the native splash now that our custom launch screen is mounted.
    SplashScreen.hideAsync();

    Animated.timing(riseAnim, {
      toValue: 1,
      duration: 1600,
      delay: 150,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [riseAnim]);

  const lockupOpacity = riseAnim;
  const lockupScale = riseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, 1],
  });

  return (
    <View style={launchStyles.container}>
      <StatusBar style="light" />

      {/* Topographic contour background */}
      <TopoContours />
      <Vignette />

      {/* Center lockup */}
      <Animated.View
        style={[
          launchStyles.lockup,
          { opacity: lockupOpacity, transform: [{ scale: lockupScale }] },
        ]}
      >
        <View style={launchStyles.badgeWrap}>
          <Image
            source={require('../assets/badge-light.png')}
            style={launchStyles.badge}
            resizeMode="contain"
          />
        </View>

        <View style={launchStyles.lexicon}>
          {LEXICON.map((entry) => (
            <View key={entry.word} style={launchStyles.lexEntry}>
              <Text style={launchStyles.lexWord}>{entry.word}</Text>
              <Text style={launchStyles.lexDef}>{entry.def}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Bottom loader + version */}
      <View style={launchStyles.bottomContent}>
        <LoadingBar />
        <Text style={launchStyles.version}>v{require('expo-constants').default.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </View>
  );
}

const launchStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141109',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
  },
  badgeWrap: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  badge: {
    width: 190,
    height: 190,
    shadowColor: brandColors.copper,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  lexicon: {
    alignItems: 'center',
  },
  lexEntry: {
    alignItems: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  lexWord: {
    fontFamily: mono,
    fontStyle: 'italic',
    fontSize: 13,
    letterSpacing: 3,
    color: brandColors.copper,
    marginBottom: 3,
  },
  lexDef: {
    fontFamily: mono,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#c8b89a',
    opacity: 0.85,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: 120,
    height: 2,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  version: {
    fontFamily: mono,
    fontSize: 8,
    letterSpacing: 1.76,
    color: 'rgba(172,109,70,0.35)',
  },
});

// ─── Root Navigator ──────────────────────────────────────────────────────────

// Start on (auth) so logged-out users never see the home screen
export const unstable_settings = {
  initialRouteName: '(auth)',
};

function RootNav() {
  const { dark } = useTheme();
  const { user, loading } = useAuth();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Initialize PostHog analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  // Screen tracking
  const currentSegment = segments.join('/');
  useEffect(() => {
    if (!currentSegment) return;
    const screenName = '/' + currentSegment
      .replace(/[a-f0-9-]{20,}/g, ':id')
      .replace(/\d{3,}/g, ':id');
    analytics.screen(screenName);
  }, [currentSegment]);

  // Register push notifications when user is authenticated
  const pushTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      // On logout, remove the token from server
      if (pushTokenRef.current) {
        removePushTokenFromServer(pushTokenRef.current);
        pushTokenRef.current = null;
      }
      return;
    }
    registerForPushNotifications().then((token) => {
      if (token) {
        pushTokenRef.current = token;
        sendPushTokenToServer(token);
      }
    });
  }, [user]);

  // Handle notification tap — navigate to deep link
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = response.notification.request.content.data?.url;
        const ALLOWED_PUSH_ROUTES = /^(expedition|entry|explorer|notifications)(\/[\w-]+)?$/;
        if (typeof url === 'string' && ALLOWED_PUSH_ROUTES.test(url)) {
          router.push(`/${url}` as any);
        } else {
          router.push('/notifications');
        }
      },
    );
    return () => subscription.remove();
  }, [router]);

  // Enforce minimum 1.5-second splash duration
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auth redirect: fires once both auth check and splash timer have resolved.
  useEffect(() => {
    if (loading || !minSplashDone) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, minSplashDone, segments, router]);

  if (loading || !minSplashDone) {
    return <LaunchScreen />;
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="expedition/[id]" />
        <Stack.Screen name="expedition/create" />
        <Stack.Screen name="expedition/edit/[id]" />
        <Stack.Screen name="entry/[id]" />
        <Stack.Screen name="entry/edit/[id]" />
        <Stack.Screen name="explorer/[username]/index" />
        <Stack.Screen name="explorer/[username]/entries" />
        <Stack.Screen name="explorer/[username]/expeditions" />
        <Stack.Screen name="explorer/[username]/followers" />
        <Stack.Screen name="explorer/[username]/following" />
        <Stack.Screen name="menu" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/preferences" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/billing" />
        <Stack.Screen name="messages/index" />
        <Stack.Screen name="messages/[username]" />
        <Stack.Screen name="sponsor/[id]" />
        <Stack.Screen name="sponsorships/index" />
        <Stack.Screen name="upgrade" />
      </Stack>
    </>
  );
}

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Jost':              require('../assets/fonts/Jost-Medium.ttf'),
    'Jost-SemiBold':     require('../assets/fonts/Jost-SemiBold.ttf'),
    'Jost-Bold':         require('../assets/fonts/Jost-Bold.ttf'),
    'Jost-MediumItalic': require('../assets/fonts/Jost-MediumItalic.ttf'),
    'Lora':              require('../assets/fonts/Lora-Regular.ttf'),
    'Lora-Medium':       require('../assets/fonts/Lora-Medium.ttf'),
    'Lora-Bold':         require('../assets/fonts/Lora-Bold.ttf'),
  });

  if (!fontsLoaded) return null; // native splash stays visible

  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  if (!stripeKey) {
    console.warn('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — Stripe features will not work.');
  }

  return (
    <StripeProvider
      publishableKey={stripeKey}
      urlScheme="heimursaga"
      merchantIdentifier="merchant.com.heimursaga.app"
    >
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <RootNav />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StripeProvider>
  );
}
