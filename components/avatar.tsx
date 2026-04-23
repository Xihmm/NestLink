import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
  const preset =
    AVATAR_PRESETS.find((item) => item.id === avatarPreset) ??
    AVATAR_PRESETS.find((item) => item.id === DEFAULT_AVATAR_PRESET);

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
          backgroundColor: preset?.backgroundColor ?? '#1E293B',
          borderColor: preset?.accentColor ?? '#60A5FA',
        },
      ]}
    >
      {avatarPreset ? (
        <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{preset?.emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{getInitials(username)}</Text>
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
