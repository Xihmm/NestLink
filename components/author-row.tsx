import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { VerifiedBadge } from '@/components/verified-badge';

type Props = {
  username: string;
  subtitle?: string;
  avatarUrl?: string;
  avatarPreset?: string;
  verified?: boolean;
  avatarSize?: number;
};

export function AuthorRow({
  username,
  subtitle,
  avatarUrl,
  avatarPreset,
  verified,
  avatarSize = 36,
}: Props) {
  return (
    <View style={styles.container}>
      <Avatar username={username} avatarUrl={avatarUrl} avatarPreset={avatarPreset} size={avatarSize} />
      <View style={styles.textWrap}>
        <View style={styles.topRow}>
          <Text style={styles.username} numberOfLines={1}>{username}</Text>
          {verified ? <VerifiedBadge compact /> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '75%',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
});
