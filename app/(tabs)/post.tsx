import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsStore } from '@/hooks/usePostsStore';
import { PostType, PostIntent } from '@/types/post';

export default function CreatePostScreen() {
  const router = useRouter();
  const { addPost } = usePostsStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<PostType | ''>('');
  const [intent, setIntent] = useState<PostIntent>('OFFER');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authorName, setAuthorName] = useState('');

  const needsDates = type === 'SUBLET' || type === 'SHORT_TERM';
  const isQA = type === 'QA';

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return false;
    }
    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    if (!type) {
      Alert.alert('Error', 'Please select a post type');
      return false;
    }
    if (!isQA && !intent) {
      Alert.alert('Error', 'Please select an intent (Offer or Seek)');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const newPost = {
      id: Date.now().toString(),
      title: title.trim(),
      body: body.trim(),
      type: type as PostType,
      intent: isQA ? null : intent,
      location: location.trim() || undefined,
      budget: budget ? parseFloat(budget) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: Date.now(),
      authorName: authorName.trim() || 'Anonymous',
    };

    addPost(newPost);
    Alert.alert('Success', 'Your post has been created!', [
      {
        text: 'OK',
        onPress: () => {
          // Reset form
          setTitle('');
          setBody('');
          setType('');
          setIntent('OFFER');
          setLocation('');
          setBudget('');
          setStartDate('');
          setEndDate('');
          setAuthorName('');
          // Navigate to feed
          router.push('/(tabs)');
        },
      },
    ]);
  };

  const TypeButton = ({ value, label }: { value: PostType; label: string }) => (
    <TouchableOpacity
      style={[styles.typeButton, type === value && styles.typeButtonActive]}
      onPress={() => {
        setType(value);
        if (value === 'QA') {
          setIntent(null);
        } else if (!intent) {
          setIntent('OFFER');
        }
      }}
    >
      <Text style={[styles.typeButtonText, type === value && styles.typeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const IntentButton = ({ value, label }: { value: PostIntent; label: string }) => (
    <TouchableOpacity
      style={[styles.intentButton, intent === value && styles.intentButtonActive]}
      onPress={() => setIntent(value)}
    >
      <Text style={[styles.intentButtonText, intent === value && styles.intentButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Post Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.typeGrid}>
            <TypeButton value="ROOMMATE" label="Roommate" />
            <TypeButton value="SUBLET" label="Sublet" />
            <TypeButton value="SHORT_TERM" label="Short-term" />
            <TypeButton value="QA" label="Q&A" />
          </View>
        </View>

        {/* Intent Selection (hidden for QA) */}
        {!isQA && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Intent <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.intentRow}>
              <IntentButton value="OFFER" label="I'm Offering" />
              <IntentButton value="SEEK" label="I'm Seeking" />
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Looking for a roommate in Downtown"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Body */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us more about your post..."
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Downtown Toronto"
            value={location}
            onChangeText={setLocation}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.label}>Budget ($/month)</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., 800"
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Dates (only for SUBLET and SHORT_TERM) */}
        {needsDates && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2025-05-01)"
                value={startDate}
                onChangeText={setStartDate}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2025-08-31)"
                value={endDate}
                onChangeText={setEndDate}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        {/* Author Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Leave blank to post anonymously"
            value={authorName}
            onChangeText={setAuthorName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Post</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  intentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  intentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  intentButtonActive: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899',
  },
  intentButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  intentButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});


