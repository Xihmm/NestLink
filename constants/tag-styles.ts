import { PostType } from '@/types/post';

export const POST_TYPE_STYLES: Record<
  PostType,
  { backgroundColor: string; color: string; borderColor: string; label?: string }
> = {
  ROOMMATE: { backgroundColor: '#1F3A5F', color: '#BFDBFE', borderColor: '#3B82F6', label: 'Roommate' },
  SUBLET: { backgroundColor: '#183B33', color: '#A7F3D0', borderColor: '#10B981', label: 'Sublet' },
  SHORT_TERM: { backgroundColor: '#453113', color: '#FDE68A', borderColor: '#F59E0B', label: 'Short Term' },
  QA: { backgroundColor: '#3C1E4F', color: '#E9D5FF', borderColor: '#A855F7', label: 'Q&A' },
};
