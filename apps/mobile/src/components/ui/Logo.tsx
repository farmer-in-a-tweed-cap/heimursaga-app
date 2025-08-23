import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

// Fallback when SVG isn't available
let Svg, Path, G;
try {
  const SvgModule = require('react-native-svg');
  Svg = SvgModule.default;
  Path = SvgModule.Path;
  G = SvgModule.G;
} catch (e) {
  console.log('SVG module not available, using text fallback');
}

interface LogoProps {
  size?: number;
  showBrand?: boolean;
  brandSize?: number;
  color?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 32, 
  showBrand = true, 
  brandSize = 20,
  color = '#AC6D46' 
}) => {
  // If SVG is available, render the full logo
  if (Svg && Path && G) {
    return (
      <View style={styles.container}>
        <Svg 
          width={size} 
          height={size} 
          viewBox="0 0 375 375" 
          preserveAspectRatio="xMidYMid meet"
        >
          <G>
            {/* Main star/compass shape */}
            <Path
              fill={color}
              fillOpacity={1}
              d="M 232.042969 237.847656 L 202.582031 212.136719 L 203.421875 203.433594 L 277.714844 277.714844 Z M 181.992188 277.460938 L 177.585938 212.460938 L 186.773438 204.894531 L 187.5 204.96875 L 187.5 358.542969 Z M 97.285156 277.714844 L 137.152344 232.042969 L 162.863281 202.582031 L 171.566406 203.433594 Z M 16.457031 187.5 L 97.546875 182.003906 L 162.535156 177.578125 L 170.105469 186.773438 L 170.03125 187.5 Z M 97.285156 97.285156 L 142.953125 137.152344 L 172.417969 162.863281 L 171.566406 171.566406 Z M 193.007812 97.527344 L 197.421875 162.535156 L 188.226562 170.105469 L 187.511719 170.03125 L 187.511719 16.445312 Z M 277.714844 97.285156 L 237.847656 142.945312 L 212.136719 172.417969 L 203.421875 171.566406 Z M 358.550781 187.511719 L 277.449219 193.007812 L 212.472656 197.410156 L 204.894531 188.226562 L 204.96875 187.511719 Z M 216.394531 202.171875 L 277.882812 196.234375 L 368.253906 187.5 L 277.882812 178.765625 L 216.394531 172.828125 L 239.78125 144.4375 L 282.832031 92.15625 L 230.5625 135.230469 L 202.183594 158.605469 L 196.234375 97.117188 L 187.511719 6.746094 L 178.777344 97.117188 L 172.828125 158.605469 L 144.449219 135.230469 L 92.167969 92.15625 L 135.230469 144.4375 L 158.605469 172.828125 L 97.117188 178.765625 L 6.746094 187.5 L 97.117188 196.234375 L 158.605469 202.171875 L 135.230469 230.5625 L 92.167969 282.832031 L 144.4375 239.78125 L 172.828125 216.394531 L 178.765625 277.871094 L 187.511719 368.253906 L 196.234375 277.871094 L 202.183594 216.394531 L 230.5625 239.78125 L 282.832031 282.832031 L 239.78125 230.5625 L 216.394531 202.171875"
            />
            
            {/* Center square with white background */}
            <Path
              fill="#ffffff"
              fillOpacity={1}
              d="M 119.835938 120.621094 L 253.59375 120.621094 L 253.59375 254.378906 L 119.835938 254.378906 Z"
            />
            
            {/* Center square border */}
            <Path
              fill={color}
              fillOpacity={1}
              stroke={color}
              strokeWidth={3}
              d="M 119.835938 120.621094 L 253.59375 120.621094 L 253.59375 254.378906 L 119.835938 254.378906 Z"
            />
            
            {/* H letter in center */}
            <G fill="#222222" fillOpacity={1}>
              <Path 
                d="M 150 160 L 150 215 M 225 160 L 225 215 M 150 187.5 L 225 187.5" 
                stroke="#222222" 
                strokeWidth={8} 
                strokeLinecap="round"
                fill="none"
              />
            </G>
          </G>
        </Svg>
        
        {showBrand && (
          <Text style={[styles.brandText, { fontSize: brandSize, color: '#1C1C1E' }]}>
            HEIMURSAGA
          </Text>
        )}
      </View>
    );
  }
  
  // Fallback when SVG isn't available
  return (
    <View style={styles.container}>
      <View style={[styles.fallbackLogo, { width: size, height: size, backgroundColor: color }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.4, color: '#ffffff' }]}>
          H
        </Text>
      </View>
      
      {showBrand && (
        <Text style={[styles.brandText, { fontSize: brandSize, color: '#1C1C1E' }]}>
          HEIMURSAGA
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  brandText: {
    fontWeight: '400',
    letterSpacing: 2,
    marginTop: 8,
  },
  fallbackLogo: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fallbackText: {
    fontWeight: 'bold',
  },
});