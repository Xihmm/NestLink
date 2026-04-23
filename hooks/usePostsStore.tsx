import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, PostStatus, PostType } from '@/types/post';
import { useAuth } from '@/hooks/useAuth';
import { applyProfileToPost } from '@/lib/userProfiles';
import { toMillis } from '@/lib/time';

interface PostsContextType {
  posts: Post[];
  loading: boolean;
  savedPostIds: string[];
  savedPostsLoading: boolean;
  addPost: (post: Post) => Promise<void>;
  updatePost: (id: string, updates: Partial<Post>, isSample?: boolean) => Promise<void>;
  updatePostStatus: (id: string, status: PostStatus, isSample?: boolean) => Promise<void>;
  deletePost: (id: string, isSample?: boolean) => Promise<void>;
  getPostById: (id: string) => Post | undefined;
  isPostSaved: (id: string) => boolean;
  toggleSavedPost: (id: string) => Promise<void>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

const SAMPLE_POSTS: Post[] = [
  {
    id: 'sample-1',
    title: 'Looking for a Roommate in Downtown',
    body: "Hi! I'm a grad student looking for a friendly roommate to share a 2BR apartment near campus. Clean, quiet, and respectful. Would love to meet someone with similar lifestyle. The place has a great kitchen and is close to public transit.",
    types: ['ROOMMATE'],
    intent: 'SEEK',
    location: 'Downtown Rochester',
    budget: 800,
    createdAt: 1736294400000,
    authorName: 'Sarah Chen',
    isSample: true,
  },
  {
    id: 'sample-3',
    title: 'Summer Sublet Available (May-Aug)',
    body: "Subletting my 1BR apartment for the summer while I'm away for an internship. Fully furnished, utilities included, great location near campus and shops. Perfect for summer students or interns!",
    types: ['SUBLET'],
    intent: 'OFFER',
    location: 'Park Ave',
    budget: 1200,
    startDate: '2026-05-01',
    endDate: '2026-08-31',
    createdAt: 1737158400000,
    authorName: 'Alex Rivera',
    isSample: true,
  },
  {
    id: 'sample-4',
    title: 'Need Sublet for Winter Term',
    body: "Looking for a sublet from January to April while I'm on co-op. Prefer something close to campus, furnished if possible. Budget flexible for the right place. Non-smoker, no pets.",
    types: ['SUBLET'],
    intent: 'SEEK',
    location: 'UR Campus',
    budget: 900,
    startDate: '2026-01-01',
    endDate: '2026-04-30',
    createdAt: 1738713600000,
    authorName: 'Jordan Lee',
    isSample: true,
  },
  {
    id: 'sample-5',
    title: 'Short-term Housing Available (2 months)',
    body: 'Private room available for 2 months starting immediately. Perfect for visiting students or those between leases. Quiet neighborhood, easy transit access. All utilities and WiFi included.',
    types: ['SHORT_TERM'],
    intent: 'OFFER',
    location: 'South Wedge',
    budget: 950,
    startDate: '2026-02-15',
    endDate: '2026-04-15',
    createdAt: 1739145600000,
    authorName: 'Taylor Brown',
    isSample: true,
  },
  {
    id: 'sample-6',
    title: 'Looking for Short-term (6 weeks)',
    body: 'Need temporary housing for 6 weeks while my apartment is being renovated. Clean, respectful tenant with references. Okay with sharing. Please reach out if you have anything available!',
    types: ['SHORT_TERM'],
    intent: 'SEEK',
    location: 'Any',
    budget: 800,
    startDate: '2026-03-01',
    endDate: '2026-04-15',
    createdAt: 1739923200000,
    authorName: 'Pat Wilson',
    isSample: true,
  },
  {
    id: 'sample-7',
    title: 'Question: Best neighborhoods for students?',
    body: "Hi everyone! I'm moving to Rochester for grad school this fall. What neighborhoods would you recommend for students? Looking for somewhere safe, affordable, and with good transit connections. Any advice appreciated!",
    types: ['QA'],
    intent: null,
    location: 'Rochester',
    createdAt: 1741046400000,
    authorName: 'Chris Martinez',
    isSample: true,
  },
];

function normalizePostSnapshot(
  id: string,
  raw: Omit<Post, 'id'> & { type?: string; createdAt?: Post['createdAt'] }
): Post {
  const types = raw.types ?? (raw.type ? [raw.type as PostType] : []);
  return {
    ...raw,
    id,
    types,
    createdAt: toMillis(raw.createdAt) ?? Date.now(),
  };
}

export const PostsProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);
  const [loading, setLoading] = useState(true);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
        const realPosts = snapshot.docs.map((item) =>
          normalizePostSnapshot(item.id, item.data() as Omit<Post, 'id'> & { type?: string })
        );
        setPosts([...realPosts, ...SAMPLE_POSTS]);
      } catch (error) {
        console.error('Failed to fetch posts from Firestore:', error);
        setPosts(SAMPLE_POSTS);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;

    setPosts((prev) => prev.map((post) => applyProfileToPost(post, profile)));
  }, [profile]);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user?.uid) {
        setSavedPostIds([]);
        setSavedPostsLoading(false);
        return;
      }

      setSavedPostsLoading(true);

      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        const savedIds = snapshot.exists() ? snapshot.data().savedPostIds : [];
        setSavedPostIds(Array.isArray(savedIds) ? savedIds : []);
      } catch (error) {
        console.error('Failed to fetch saved posts:', error);
        setSavedPostIds([]);
      } finally {
        setSavedPostsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user?.uid]);

  const addPost = async (post: Post) => {
    if (!user?.uid) {
      throw new Error('Authentication is still loading. Please try again.');
    }

    const { id, isSample, createdAt, ...firestoreData } = post;
    const payload = Object.fromEntries(
      Object.entries({
        ...firestoreData,
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorUsername: profile?.username ?? post.authorUsername,
        authorAvatarUrl: profile?.avatarUrl ?? post.authorAvatarUrl ?? null,
        authorAvatarPreset: profile?.avatarUrl ? null : profile?.avatarPreset ?? post.authorAvatarPreset ?? null,
        authorVerified: profile?.isVerified ?? false,
        authorEmail: user.email ?? post.authorEmail ?? null,
      }).filter(([, value]) => value !== undefined)
    );

    const docRef = await addDoc(collection(db, 'posts'), payload);
    const savedPost: Post = {
      ...post,
      id: docRef.id,
      createdAt: Date.now(),
      authorId: user.uid,
      authorUsername: profile?.username ?? post.authorUsername,
      authorAvatarUrl: profile?.avatarUrl ?? post.authorAvatarUrl,
      authorAvatarPreset: profile?.avatarUrl ? undefined : profile?.avatarPreset ?? post.authorAvatarPreset,
      authorVerified: profile?.isVerified ?? false,
      authorEmail: user.email ?? post.authorEmail,
    };
    setPosts((prev) => [savedPost, ...prev]);
  };

  const updatePost = async (id: string, updates: Partial<Post>, isSample = false) => {
    if (!isSample) {
      const { isSample: _sampleFlag, id: _postId, ...firestoreUpdates } = updates as Post;
      const cleanData = Object.fromEntries(
        Object.entries(firestoreUpdates).filter(([, value]) => value !== undefined)
      );
      await updateDoc(doc(db, 'posts', id), cleanData);
    }

    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, ...updates } : post)));
  };

  const updatePostStatus = async (id: string, status: PostStatus, isSample = false) => {
    if (!isSample) {
      await updateDoc(doc(db, 'posts', id), { status });
    }

    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, status } : post)));
  };

  const deletePost = async (id: string, isSample = false) => {
    if (!isSample) {
      await deleteDoc(doc(db, 'posts', id));
    }
    setPosts((prev) => prev.filter((post) => post.id !== id));
    setSavedPostIds((prev) => prev.filter((savedId) => savedId !== id));
  };

  const getPostById = (id: string) => posts.find((post) => post.id === id);
  const isPostSaved = (id: string) => savedPostIds.includes(id);

  const toggleSavedPost = async (id: string) => {
    if (!user?.uid) {
      throw new Error('Authentication is still loading. Please try again.');
    }

    const nextSavedPostIds = savedPostIds.includes(id)
      ? savedPostIds.filter((savedId) => savedId !== id)
      : [...savedPostIds, id];

    setSavedPostIds(nextSavedPostIds);

    try {
      await setDoc(doc(db, 'users', user.uid), { savedPostIds: nextSavedPostIds }, { merge: true });
    } catch (error) {
      console.error('Failed to persist saved posts:', error);
      setSavedPostIds(savedPostIds);
      throw error;
    }
  };

  const value = useMemo<PostsContextType>(() => ({
    posts,
    loading,
    savedPostIds,
    savedPostsLoading,
    addPost,
    updatePost,
    updatePostStatus,
    deletePost,
    getPostById,
    isPostSaved,
    toggleSavedPost,
  }), [loading, posts, savedPostIds, savedPostsLoading]);

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePostsStore = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePostsStore must be used within a PostsProvider');
  }
  return context;
};
