import React from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET } from '@/constants/avatar-presets';

type Props = {
  username?: string | null;
  avatarUrl?: string;
  avatarPreset?: string;
  size?: number;
};

function getInitials(username?: string | null): string {
  if (!username?.trim()) return '?';
  return username
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ username, avatarUrl, avatarPreset, size = 40 }: Props) {
  const isDark = useColorScheme() === 'dark';
  const preset =
    AVATAR_PRESETS.find((item) => item.id === avatarPreset) ??
    AVATAR_PRESETS.find((item) => item.id === DEFAULT_AVATAR_PRESET);

  // Initials fallback colors adapt to light/dark mode
  const initialsBackground = isDark ? '#1E3A5F' : '#DBEAFE';
  const initialsColor = isDark ? '#93C5FD' : '#1E40AF';
  const initialsBorder = isDark ? '#3B82F6' : '#93C5FD';

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarPreset ? (preset?.backgroundColor ?? initialsBackground) : initialsBackground,
          borderColor: avatarPreset ? (preset?.accentColor ?? initialsBorder) : initialsBorder,
        },
      ]}
    >
      {avatarPreset ? (
        <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{preset?.emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.34, color: initialsColor }]}>{getInitials(username)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#0F172A',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emoji: {
    color: '#FFFFFF',
  },
  initials: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
