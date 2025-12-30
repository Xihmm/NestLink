export type PostType = "ROOMMATE" | "SUBLET" | "SHORT_TERM" | "QA";
export type PostIntent = "OFFER" | "SEEK" | null;

export interface Post {
  id: string;
  title: string;
  body: string;
  type: PostType;
  intent: PostIntent;
  location?: string;
  budget?: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  createdAt: number; // timestamp
  authorName?: string; // default "Anonymous"
}


