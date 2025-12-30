// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PostsProvider } from '@/hooks/usePostsStore';

import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useEffect } from 'react';

export default function RootLayout() {
  // ✅ 修复：必须在这里定义 colorScheme
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 1. 监听登录状态
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ 用户已登录, UID:", user.uid);
      } else {
        // 2. 执行匿名登录
        console.log("⏳ 正在尝试匿名登录...");
        signInAnonymously(auth)
          .then((userCredential) => {
            console.log("🚀 匿名登录成功, UID:", userCredential.user.uid);
          })
          .catch((error) => {
            console.error("❌ 匿名登录失败:", error.code, error.message);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <PostsProvider>
      {/* 现在 colorScheme 已经定义，这里不会再报错 */}
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ headerShown: true, title: 'Post Details' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PostsProvider>
  );
}