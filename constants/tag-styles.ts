import { PostType } from '@/types/post';

type TagStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
  label?: string;
};

// Dark mode: deep-tinted backgrounds with soft light text (original look)
const DARK: Record<PostType, TagStyle> = {
  ROOMMATE:   { backgroundColor: '#1F3A5F', color: '#BFDBFE', borderColor: '#3B82F6',  label: 'Roommate'   },
  SUBLET:     { backgroundColor: '#183B33', color: '#A7F3D0', borderColor: '#10B981',  label: 'Sublet'     },
  SHORT_TERM: { backgroundColor: '#453113', color: '#FDE68A', borderColor: '#F59E0B',  label: 'Short Term' },
  QA:         { backgroundColor: '#3C1E4F', color: '#E9D5FF', borderColor: '#A855F7',  label: 'Q&A'        },
};

// Light mode: pastel backgrounds with rich dark text — same hue family, readable on white
const LIGHT: Record<PostType, TagStyle> = {
  ROOMMATE:   { backgroundColor: '#DBEAFE', color: '#1D4ED8', borderColor: '#93C5FD',  label: 'Roommate'   },
  SUBLET:     { backgroundColor: '#D1FAE5', color: '#065F46', borderColor: '#6EE7B7',  label: 'Sublet'     },
  SHORT_TERM: { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D',  label: 'Short Term' },
  QA:         { backgroundColor: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD',  label: 'Q&A'        },
};

export const getTagStyles = (isDark: boolean): Record<PostType, TagStyle> =>
  isDark ? DARK : LIGHT;

// Legacy export — keeps any existing direct imports from breaking
export const POST_TYPE_STYLES = DARK;
