import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import pigImage from '@/assets/images/pig.png';

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0F172A' : '#EEF2F7',
  card: isDark ? '#1E293B' : '#FFFFFF',
  text: isDark ? '#F1F5F9' : '#1F2937',
  subtext: isDark ? '#94A3B8' : '#6B7280',
  border: isDark ? '#334155' : '#E5E7EB',
  input: isDark ? '#1E293B' : '#FFFFFF',
});

const createStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    content: {
      flex: 1,
      paddingHorizontal: 32,
      justifyContent: 'space-between',
      paddingBottom: 40,
    },
    hero: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 0,
    },
    logoImage: {
      width: 286,
      height: 286,
      marginTop: 24,
    },
    title: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 18,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 26,
      maxWidth: 300,
      marginTop: 16,
    },
    footer: {
      gap: 16,
      alignItems: 'center',
    },
    continueButton: {
      backgroundColor: '#3B82F6',
      paddingVertical: 18,
      borderRadius: 14,
      alignItems: 'center',
      width: '100%',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    disclaimer: {
      fontSize: 12,
      color: '#9CA3AF',
      textAlign: 'center',
      lineHeight: 18,
    },
    guestLink: {
      fontSize: 15,
      color: colors.subtext,
      fontWeight: '500',
      textAlign: 'center',
    },
    contactLink: {
      fontSize: 14,
      color: '#2563EB',
      textAlign: 'center',
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });

export default function LoginScreen() {
  const router = useRouter();
  const { loading, continueAsGuest, sessionState, hasSession } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  // Local state to show spinner while continueAsGuest is in flight.
  const [guestLoading, setGuestLoading] = useState(false);

  console.log(
    '[login] render loading=', loading,
    'hasSession=', hasSession,
    'sessionState=', sessionState
  );

  // If auth is resolved and user already has a session, redirect immediately.
  // This check comes FIRST — even if guestLoading is true — so that once
  // onAuthStateChanged fires with the new user, the <Redirect> takes priority
  // over the spinner. This is the Expo Router-safe pattern: rendering <Redirect>
  // is more reliable than calling router.replace() inside a useEffect.
  if (!loading && hasSession) {
    console.log('[login] session active, rendering <Redirect> to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // While Firebase is still hydrating auth state, or while continueAsGuest
  // is in flight, show a spinner so the login form never flashes mid-transition.
  if (loading || guestLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const handleContinue = async () => {
    setGuestLoading(true);
    try {
      // continueAsGuest signs out any lingering registered user first,
      // then creates a fresh anonymous session.
      await continueAsGuest();
      // Do NOT call router.replace here — onAuthStateChanged hasn't fired yet,
      // so React state still shows the old user. Instead, let the re-render
      // above handle navigation: once hasSession becomes true, <Redirect> fires.
    } catch (error) {
      console.error('Failed to continue from login screen:', error);
      Alert.alert('Unable to continue', 'We could not start your session. Please try again.');
      setGuestLoading(false);
    }
    // Note: if continueAsGuest succeeds, setGuestLoading(false) is intentionally
    // NOT called — the spinner stays up until the <Redirect> kicks in.
  };

  const handleContactPress = async () => {
    const url = 'mailto:zgong12@u.rochester.edu';
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unavailable', 'No email app is available on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open contact email link:', error);
      Alert.alert('Unable to open email', 'Please try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>NestLink</Text>
          <Text style={styles.tagline}>
            Sublets, short-term, roommates — finally all in one place, built for UR.
          </Text>
          <Image source={pigImage} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={() => router.push('/auth')}>
            <Text style={styles.continueButtonText}>Sign up with Email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContinue}>
            <Text style={styles.guestLink}>
              {sessionState === 'guest' ? 'Resume guest session →' : 'Browse as guest →'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service.{'\n'}
            Your posts are visible to all NestLink users.
          </Text>
          <TouchableOpacity onPress={handleContactPress} hitSlop={8}>
            <Text style={styles.contactLink}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
