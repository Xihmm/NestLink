import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { POST_TYPE_STYLES } from '@/constants/tag-styles';
import { PostType } from '@/types/post';

type Props = {
  type: PostType;
};

export function TagBadge({ type }: Props) {
  const style = POST_TYPE_STYLES[type];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: style.color }]}>{style.label ?? type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
