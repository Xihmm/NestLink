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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { usePostsStore } from '@/hooks/usePostsStore';
import { useAuth } from '@/hooks/useAuth';
import { Post, PostType, PostIntent } from '@/types/post';

const MAX_IMAGES = 8;

export default function CreatePostScreen() {
  const router = useRouter();
  const { addPost } = usePostsStore();
  const { user, loading: authLoading, isAnonymous } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [types, setTypes] = useState<PostType[]>([]);
  const [typeWarning, setTypeWarning] = useState('');
  const [intent, setIntent] = useState<PostIntent>('OFFER');
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [startMM, setStartMM] = useState('');
  const [startDD, setStartDD] = useState('');
  const [startYYYY, setStartYYYY] = useState('');
  const [endMM, setEndMM] = useState('');
  const [endDD, setEndDD] = useState('');
  const [endYYYY, setEndYYYY] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [wechatId, setWechatId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isQA = types.includes('QA');
  const isRoommateOnly = types.length === 1 && types.includes('ROOMMATE');
  const needsDates = types.includes('SUBLET') || types.includes('SHORT_TERM');

  const toggleType = (value: PostType) => {
    let next: PostType[];
    if (value === 'QA') {
      // QA always alone — selecting it clears everything else
      next = ['QA'];
    } else if (types.includes('QA')) {
      // Selecting a non-QA type clears QA
      next = [value];
    } else if (types.includes(value)) {
      // Deselect — but don't allow empty
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
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_IMAGES} photos per post.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - imageUris.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImageUris((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const uploadImage = async (uri: string, tempId: string, index: number): Promise<string> => {
    const imageRef = storageRef(storage, `posts/${tempId}/${Date.now()}_${index}.jpg`);

    console.info('Starting image upload.', { uri, tempId, index, storagePath: imageRef.fullPath });

    let blob: Blob;
    try {
      const response = await fetch(uri);
      blob = await response.blob();
    } catch (error) {
      console.error('Image upload preparation failed:', error);
      throw new Error('Failed to read the selected image before upload.');
    }

    try {
      await uploadBytes(imageRef, blob);
    } catch (error) {
      console.error('Firebase Storage write failed:', {
        error,
        storagePath: imageRef.fullPath,
        tempId,
        index,
      });
      throw new Error('Failed to upload the image to Firebase Storage.');
    }

    return await getDownloadURL(imageRef);
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return false;
    }
    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    if (types.length === 0) {
      Alert.alert('Error', 'Please select a post type');
      return false;
    }
    if (!isQA && !isRoommateOnly && !intent) {
      Alert.alert('Error', 'Please select an intent (Offer or Seek)');
      return false;
    }
    if (needsDates) {
      const se = validateDate(startMM, startDD, startYYYY);
      const ee = validateDate(endMM, endDD, endYYYY);
      setStartDateError(se);
      setEndDateError(ee);
      if (se || ee) return false;
    }
    if (budgetMin && parseInt(budgetMin) <= 0) {
      Alert.alert('Invalid Budget', 'Budget must be greater than 0');
      return false;
    }
    if (budgetMax && parseInt(budgetMax) <= 0) {
      Alert.alert('Invalid Budget', 'Budget must be greater than 0');
      return false;
    }
    if (budgetMin && budgetMax && parseInt(budgetMin) > parseInt(budgetMax)) {
      Alert.alert('Invalid Budget', 'Min budget cannot be greater than max');
      return false;
    }
    if (!wechatId.trim() && !phone.trim() && !email.trim()) {
      Alert.alert('Error', 'Please provide at least one contact method');
      return false;
    }
    return true;
  };

  const doSubmit = async () => {
    if (submitting) return;
    if (!validateForm()) return;
    if (authLoading) {
      console.warn('Blocked post submit while auth is still loading.');
      Alert.alert('Please wait', 'Your account is still loading. Try again in a moment.');
      return;
    }
    if (!user?.uid) {
      console.error('Blocked post submit because auth user.uid is missing.', { user });
      Alert.alert('Unable to post', 'We could not verify your account yet. Please try again.');
      return;
    }

    setSubmitting(true);

    try {
      const tempId = Date.now().toString();
      let imageUrls: string[] = [];
      if (imageUris.length > 0) {
        console.info('Uploading images for new post.', {
          uid: user.uid,
          imageCount: imageUris.length,
          tempId,
        });

        try {
          imageUrls = await Promise.all(
            imageUris.map((uri, i) => uploadImage(uri, tempId, i))
          );
        } catch (error) {
          console.error('Image upload failed:', error);
          Alert.alert('Upload failed', error instanceof Error ? error.message : 'We could not upload your images.');
          setSubmitting(false);
          return;
        }
      }

      const newPost: Post = {
        id: tempId,
        title: title.trim(),
        body: body.trim(),
        types,
        intent: isQA ? null : intent,
        location: location.trim() || undefined,
        budgetMin: budgetMin ? parseInt(budgetMin) : undefined,
        budgetMax: budgetMax ? parseInt(budgetMax) : undefined,
        startDate: needsDates ? buildDateString(startMM, startDD, startYYYY) : undefined,
        endDate: needsDates ? buildDateString(endMM, endDD, endYYYY) : undefined,
        createdAt: Date.now(),
        authorName: authorName.trim() || 'Anonymous',
        wechatId: wechatId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        negotiable: negotiable || undefined,
        authorEmail: user.email || undefined,
      };

      console.info('Submitting Firestore post creation.', {
        uid: user.uid,
        tempId,
        hasImages: imageUrls.length > 0,
      });

      try {
        await addPost(newPost);
      } catch (error) {
        console.error('Create post failed during Firestore write:', error);
        Alert.alert(
          'Post failed',
          error instanceof Error ? error.message : 'We could not create your post. Please try again.'
        );
        setSubmitting(false);
        return;
      }

      Alert.alert('Success! 🎉', 'Your post has been created!', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setBody('');
            setTypes([]);
            setTypeWarning('');
            setIntent('OFFER');
            setLocation('');
            setBudgetMin('');
            setBudgetMax('');
            setStartMM(''); setStartDD(''); setStartYYYY('');
            setEndMM(''); setEndDD(''); setEndYYYY('');
            setStartDateError(''); setEndDateError('');
            setAuthorName('');
            setWechatId('');
            setPhone('');
            setEmail('');
            setNegotiable(false);
            setImageUris([]);
            setSubmitting(false);
            router.replace('/(tabs)');
          },
        },
      ]);
    } catch (error) {
      console.error('Unexpected create post failure:', error);
      Alert.alert('Post failed', 'Something went wrong while creating your post.');
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isAnonymous) {
      Alert.alert(
        'Sign up to post',
        'Create an account to manage your posts across devices.',
        [
          { text: 'Sign Up', onPress: () => router.push('/auth') },
          { text: 'Post Anonymously', style: 'cancel', onPress: () => doSubmit() },
        ]
      );
    } else {
      doSubmit();
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
          {typeWarning ? (
            <Text style={styles.typeWarning}>{typeWarning}</Text>
          ) : null}
        </View>

        {/* Intent Selection (hidden for QA and ROOMMATE-only) */}
        {!isQA && !isRoommateOnly && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Intent <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.intentRow}>
              <IntentButton value="OFFER" label="I'm Offering" />
              <IntentButton value="SEEK" label="I'm Seeking" />
            </View>
            {intent === 'OFFER' && (
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6, paddingHorizontal: 4 }}>
                🏠 You have a place or spot to offer — sublet, room, short-term stay, etc.
              </Text>
            )}
            {intent === 'SEEK' && (
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6, paddingHorizontal: 4 }}>
                🔍 You're looking for a place, a room, or a roommate.
              </Text>
            )}
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
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Fill in min, max, or both. e.g. "up to $1200/mo", "$800+/mo", or "$800–$1200/mo"
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min"
              keyboardType="numeric"
              value={budgetMin}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, '');
                setBudgetMin(cleaned);
                if (cleaned === '' && budgetMax === '') setNegotiable(false);
              }}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={{ color: '#9CA3AF' }}>—</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Max"
              keyboardType="numeric"
              value={budgetMax}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, '');
                setBudgetMax(cleaned);
                if (cleaned === '' && budgetMin === '') setNegotiable(false);
              }}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={{ color: '#6B7280', fontSize: 13 }}>$/mo</Text>
          </View>
        </View>

        {/* Negotiable toggle */}
        {(budgetMin.trim() !== '' || budgetMax.trim() !== '') && (
          <View style={{ marginTop: 0, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setNegotiable(!negotiable)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 4,
                borderWidth: 1.5, borderColor: negotiable ? '#3B82F6' : '#D1D5DB',
                backgroundColor: negotiable ? '#3B82F6' : 'white',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {negotiable && <Text style={{ color: 'white', fontSize: 13 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, color: '#374151' }}>{'🔪  Open to negotiation'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dates (only for SUBLET and SHORT_TERM) */}
        {needsDates && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.dateInput, { flex: 1 }]}
                  placeholder="MM"
                  value={startMM}
                  onChangeText={(v) => { setStartMM(v.replace(/\D/g, '').slice(0, 2)); setStartDateError(''); }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  style={[styles.dateInput, { flex: 1 }]}
                  placeholder="DD"
                  value={startDD}
                  onChangeText={(v) => { setStartDD(v.replace(/\D/g, '').slice(0, 2)); setStartDateError(''); }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  style={[styles.dateInput, { flex: 2 }]}
                  placeholder="YYYY"
                  value={startYYYY}
                  onChangeText={(v) => { setStartYYYY(v.replace(/\D/g, '').slice(0, 4)); setStartDateError(''); }}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {startDateError ? <Text style={styles.dateError}>{startDateError}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>End Date</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.dateInput, { flex: 1 }]}
                  placeholder="MM"
                  value={endMM}
                  onChangeText={(v) => { setEndMM(v.replace(/\D/g, '').slice(0, 2)); setEndDateError(''); }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  style={[styles.dateInput, { flex: 1 }]}
                  placeholder="DD"
                  value={endDD}
                  onChangeText={(v) => { setEndDD(v.replace(/\D/g, '').slice(0, 2)); setEndDateError(''); }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  style={[styles.dateInput, { flex: 2 }]}
                  placeholder="YYYY"
                  value={endYYYY}
                  onChangeText={(v) => { setEndYYYY(v.replace(/\D/g, '').slice(0, 4)); setEndDateError(''); }}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {endDateError ? <Text style={styles.dateError}>{endDateError}</Text> : null}
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

        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Contact Info <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.contactHint}>At least one required</Text>
          <TextInput
            style={[styles.input, styles.contactInput]}
            placeholder="Your WeChat ID"
            value={wechatId}
            onChangeText={setWechatId}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[styles.input, styles.contactInput]}
            placeholder="e.g. 585-123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos (optional)</Text>
          <View style={styles.imageRow}>
            {imageUris.map((uri, i) => (
              <View key={i} style={styles.imageThumbContainer}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUris((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {imageUris.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.imageHint}>{imageUris.length}/{MAX_IMAGES} photos</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Posting...' : 'Create Post'}
          </Text>
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
  contactHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  contactInput: {
    marginBottom: 10,
  },
  typeWarning: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 8,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dateError: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
  },
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
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
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
