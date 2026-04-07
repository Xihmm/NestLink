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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { usePostsStore } from '@/hooks/usePostsStore';
import { Post, PostType, PostIntent } from '@/types/post';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPostById, updatePost } = usePostsStore();
  const router = useRouter();

  const post = getPostById(id);

  const parseMMDDYYYY = (dateStr?: string) => {
    if (!dateStr) return { mm: '', dd: '', yyyy: '' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { mm: '', dd: '', yyyy: '' };
    return {
      mm: String(d.getUTCMonth() + 1).padStart(2, '0'),
      dd: String(d.getUTCDate()).padStart(2, '0'),
      yyyy: String(d.getUTCFullYear()),
    };
  };

  const startParsed = parseMMDDYYYY(post?.startDate);
  const endParsed = parseMMDDYYYY(post?.endDate);

  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [types, setTypes] = useState<PostType[]>(post?.types ?? []);
  const [typeWarning, setTypeWarning] = useState('');
  const [intent, setIntent] = useState<PostIntent>(post?.intent ?? 'OFFER');
  const [location, setLocation] = useState(post?.location ?? '');
  const [budget, setBudget] = useState(post?.budget ? String(post.budget) : '');
  const [startMM, setStartMM] = useState(startParsed.mm);
  const [startDD, setStartDD] = useState(startParsed.dd);
  const [startYYYY, setStartYYYY] = useState(startParsed.yyyy);
  const [endMM, setEndMM] = useState(endParsed.mm);
  const [endDD, setEndDD] = useState(endParsed.dd);
  const [endYYYY, setEndYYYY] = useState(endParsed.yyyy);
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [authorName, setAuthorName] = useState(post?.authorName ?? '');
  const [wechatId, setWechatId] = useState(post?.wechatId ?? '');
  const [phone, setPhone] = useState(post?.phone ?? '');
  const [email, setEmail] = useState(post?.email ?? '');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(post?.imageUrls ?? []);
  const [newImageUris, setNewImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!post) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Post' }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </View>
    );
  }

  const isQA = types.includes('QA');
  const isRoommateOnly = types.length === 1 && types.includes('ROOMMATE');
  const needsDates = types.includes('SUBLET') || types.includes('SHORT_TERM');

  const toggleType = (value: PostType) => {
    let next: PostType[];
    if (value === 'QA') {
      next = ['QA'];
    } else if (types.includes('QA')) {
      next = [value];
    } else if (types.includes(value)) {
      next = types.filter((t) => t !== value);
      if (next.length === 0) return;
    } else {
      next = [...types, value];
    }
    setTypeWarning('');
    setTypes(next);
    if (next.includes('QA')) {
      setIntent(null);
    } else if (next.length === 1 && next.includes('ROOMMATE')) {
      setIntent('SEEK');
    } else if (!intent) {
      setIntent('OFFER');
    }
  };

  const buildDateString = (mm: string, dd: string, yyyy: string) => {
    if (!mm || !dd || !yyyy || yyyy.length < 4) return undefined;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };

  const validateDate = (mm: string, dd: string, yyyy: string): string => {
    if (!mm && !dd && !yyyy) return '';
    if (!mm || !dd || !yyyy || yyyy.length < 4) return 'Enter a complete date (MM / DD / YYYY)';
    const date = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
    if (isNaN(date.getTime())) return 'Invalid date';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return 'Date cannot be in the past';
    return '';
  };

  const pickImages = async () => {
    const totalImages = existingImageUrls.length + newImageUris.length;
    if (totalImages >= 3) {
      Alert.alert('Limit reached', 'You can upload up to 3 photos per post.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 3 - totalImages,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setNewImageUris((prev) => [...prev, ...uris].slice(0, 3 - existingImageUrls.length));
    }
  };

  const uploadImage = async (uri: string, postId: string, index: number): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageRef = storageRef(storage, `posts/${postId}/${Date.now()}_${index}.jpg`);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  };

  const validateForm = () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return false; }
    if (!body.trim()) { Alert.alert('Error', 'Please enter a description'); return false; }
    if (types.length === 0) { Alert.alert('Error', 'Please select a post type'); return false; }
    if (!isQA && !isRoommateOnly && !intent) { Alert.alert('Error', 'Please select an intent'); return false; }
    if (needsDates) {
      const se = validateDate(startMM, startDD, startYYYY);
      const ee = validateDate(endMM, endDD, endYYYY);
      setStartDateError(se);
      setEndDateError(ee);
      if (se || ee) return false;
    }
    if (!wechatId.trim() && !phone.trim() && !email.trim()) {
      Alert.alert('Error', 'Please provide at least one contact method');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let uploadedUrls: string[] = [];
      if (newImageUris.length > 0) {
        uploadedUrls = await Promise.all(
          newImageUris.map((uri, i) => uploadImage(uri, id, i))
        );
      }

      const allImageUrls = [...existingImageUrls, ...uploadedUrls];

      const updates: Partial<Post> = {
        title: title.trim(),
        body: body.trim(),
        types,
        intent: isQA ? null : intent,
        location: location.trim() || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        startDate: needsDates ? buildDateString(startMM, startDD, startYYYY) : undefined,
        endDate: needsDates ? buildDateString(endMM, endDD, endYYYY) : undefined,
        authorName: authorName.trim() || 'Anonymous',
        wechatId: wechatId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        imageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
      };

      await updatePost(id, updates, post.isSample);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      setSubmitting(false);
    }
  };

  const TypeButton = ({ value, label }: { value: PostType; label: string }) => (
    <TouchableOpacity
      style={[styles.typeButton, types.includes(value) && styles.typeButtonActive]}
      onPress={() => toggleType(value)}
    >
      <Text style={[styles.typeButtonText, types.includes(value) && styles.typeButtonTextActive]}>
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
      <Stack.Screen options={{ title: 'Edit Post' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Post Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeGrid}>
            <TypeButton value="ROOMMATE" label="Roommate" />
            <TypeButton value="SUBLET" label="Sublet" />
            <TypeButton value="SHORT_TERM" label="Short-term" />
            <TypeButton value="QA" label="Q&A" />
          </View>
          {typeWarning ? <Text style={styles.typeWarning}>{typeWarning}</Text> : null}
        </View>

        {/* Intent Selection */}
        {!isQA && !isRoommateOnly && (
          <View style={styles.section}>
            <Text style={styles.label}>Intent <Text style={styles.required}>*</Text></Text>
            <View style={styles.intentRow}>
              <IntentButton value="OFFER" label="I'm Offering" />
              <IntentButton value="SEEK" label="I'm Seeking" />
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Body */}
        <View style={styles.section}>
          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
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
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor="#9CA3AF" />
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.label}>Budget ($/month)</Text>
          <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
        </View>

        {/* Dates */}
        {needsDates && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.dateRow}>
                <TextInput style={[styles.dateInput, { flex: 1 }]} placeholder="MM" value={startMM} onChangeText={(v) => { setStartMM(v.replace(/\D/g, '').slice(0, 2)); setStartDateError(''); }} keyboardType="numeric" maxLength={2} placeholderTextColor="#9CA3AF" />
                <Text style={styles.dateSep}>/</Text>
                <TextInput style={[styles.dateInput, { flex: 1 }]} placeholder="DD" value={startDD} onChangeText={(v) => { setStartDD(v.replace(/\D/g, '').slice(0, 2)); setStartDateError(''); }} keyboardType="numeric" maxLength={2} placeholderTextColor="#9CA3AF" />
                <Text style={styles.dateSep}>/</Text>
                <TextInput style={[styles.dateInput, { flex: 2 }]} placeholder="YYYY" value={startYYYY} onChangeText={(v) => { setStartYYYY(v.replace(/\D/g, '').slice(0, 4)); setStartDateError(''); }} keyboardType="numeric" maxLength={4} placeholderTextColor="#9CA3AF" />
              </View>
              {startDateError ? <Text style={styles.dateError}>{startDateError}</Text> : null}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>End Date</Text>
              <View style={styles.dateRow}>
                <TextInput style={[styles.dateInput, { flex: 1 }]} placeholder="MM" value={endMM} onChangeText={(v) => { setEndMM(v.replace(/\D/g, '').slice(0, 2)); setEndDateError(''); }} keyboardType="numeric" maxLength={2} placeholderTextColor="#9CA3AF" />
                <Text style={styles.dateSep}>/</Text>
                <TextInput style={[styles.dateInput, { flex: 1 }]} placeholder="DD" value={endDD} onChangeText={(v) => { setEndDD(v.replace(/\D/g, '').slice(0, 2)); setEndDateError(''); }} keyboardType="numeric" maxLength={2} placeholderTextColor="#9CA3AF" />
                <Text style={styles.dateSep}>/</Text>
                <TextInput style={[styles.dateInput, { flex: 2 }]} placeholder="YYYY" value={endYYYY} onChangeText={(v) => { setEndYYYY(v.replace(/\D/g, '').slice(0, 4)); setEndDateError(''); }} keyboardType="numeric" maxLength={4} placeholderTextColor="#9CA3AF" />
              </View>
              {endDateError ? <Text style={styles.dateError}>{endDateError}</Text> : null}
            </View>
          </>
        )}

        {/* Author Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Name (optional)</Text>
          <TextInput style={styles.input} value={authorName} onChangeText={setAuthorName} placeholderTextColor="#9CA3AF" />
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.label}>Contact Info <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, styles.contactInput]} placeholder="WeChat ID" value={wechatId} onChangeText={setWechatId} placeholderTextColor="#9CA3AF" />
          <TextInput style={[styles.input, styles.contactInput]} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.imageRow}>
            {existingImageUrls.map((url, i) => (
              <View key={`existing-${i}`} style={styles.imageThumbContainer}>
                <Image source={{ uri: url }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {newImageUris.map((uri, i) => (
              <View key={`new-${i}`} style={styles.imageThumbContainer}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setNewImageUris((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {existingImageUrls.length + newImageUris.length < 3 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.imageHint}>{existingImageUrls.length + newImageUris.length}/3 photos</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#6B7280' },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  required: { color: '#EF4444' },
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
  textArea: { minHeight: 120, paddingTop: 12 },
  contactInput: { marginBottom: 10 },
  typeWarning: { fontSize: 13, color: '#F59E0B', marginTop: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeButton: {
    flex: 1, minWidth: '45%', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  typeButtonText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  typeButtonTextActive: { color: '#FFFFFF' },
  intentRow: { flexDirection: 'row', gap: 10 },
  intentButton: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center',
  },
  intentButtonActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  intentButtonText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  intentButtonTextActive: { color: '#FFFFFF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#111827', textAlign: 'center',
  },
  dateSep: { fontSize: 18, color: '#9CA3AF', fontWeight: '600' },
  dateError: { fontSize: 13, color: '#EF4444', marginTop: 6 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageThumbContainer: { position: 'relative' },
  imageThumb: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#E5E7EB' },
  removeImageButton: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  removeImageText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  addImageButton: {
    width: 90, height: 90, borderRadius: 8, backgroundColor: '#F3F4F6',
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addImageIcon: { fontSize: 24, color: '#9CA3AF' },
  addImageText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  imageHint: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  submitButton: {
    backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    marginTop: 8, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  bottomPadding: { height: 40 },
});
