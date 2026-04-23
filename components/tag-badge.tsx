import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { getTagStyles } from '@/constants/tag-styles';
import { PostType } from '@/types/post';

type Props = {
  type: PostType;
  small?: boolean;
};

export function TagBadge({ type, small }: Props) {
  const colorScheme = useColorScheme();
  const style = getTagStyles(colorScheme === 'dark')[type];

  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSmall,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, small && styles.textSmall, { color: style.color }]}>
        {style.label ?? type}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 10,
  },
});
