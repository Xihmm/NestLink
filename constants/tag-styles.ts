import { PostType } from '@/types/post';

export const POST_TYPE_STYLES: Record<PostType, { backgroundColor: string; color: string }> = {
  ROOMMATE: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  SUBLET: { backgroundColor: '#D1FAE5', color: '#065F46' },
  SHORT_TERM: { backgroundColor: '#FEF3C7', color: '#92400E' },
  QA: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
};
