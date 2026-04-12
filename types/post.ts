export type PostType = "ROOMMATE" | "SUBLET" | "SHORT_TERM" | "QA";
export type PostIntent = "OFFER" | "SEEK" | null;
export type PostStatus = "ACTIVE" | "FOUND" | "RENTED_OUT" | "CLOSED";

export interface Post {
  id: string;
  title: string;
  body: string;
  types: PostType[];
  intent: PostIntent;
  location?: string;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  createdAt: number; // timestamp
  authorName?: string; // default "Anonymous"
  authorUsername?: string;
  isAnonymousAuthor?: boolean;
  wechatId?: string;
  phone?: string;
  email?: string;
  authorId?: string;
  authorEmail?: string;
  isSample?: boolean;
  status?: PostStatus;
  imageUrls?: string[];
  negotiable?: boolean;
}

