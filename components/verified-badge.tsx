import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  compact?: boolean;
};

export function VerifiedBadge({ compact = false }: Props) {
  return (
    <View style={[styles.badge, compact && styles.compactBadge]}>
      <Text style={[styles.text, compact && styles.compactText]}>UR Verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  compactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 10,
  },
});
