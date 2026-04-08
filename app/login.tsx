import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { initAnonymousUser } from '@/lib/authService';
import pigImage from '@/assets/images/pig.png';

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleContinue = async () => {
    if (loading) {
      Alert.alert('Please wait', 'Your account is still loading. Try again in a moment.');
      return;
    }

    try {
      if (!user) {
        await initAnonymousUser();
      }
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to continue from login screen:', error);
      Alert.alert('Unable to continue', 'We could not start your session. Please try again.');
    }
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
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    width: 210,
    height: 210,
    marginTop: 28,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: '#6B7280',
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
  contactLink: {
    fontSize: 14,
    color: '#2563EB',
    textAlign: 'center',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
