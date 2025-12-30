import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Post } from '@/types/post';

interface PostsContextType {
  posts: Post[];
  addPost: (post: Post) => void;
  getPostById: (id: string) => Post | undefined;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

// Sample seed data
const SAMPLE_POSTS: Post[] = [
  {
    id: '1',
    title: 'Looking for a Roommate in Downtown',
    body: 'Hi! I\'m a grad student looking for a friendly roommate to share a 2BR apartment near campus. Clean, quiet, and respectful. Would love to meet someone with similar lifestyle. The place has a great kitchen and is close to public transit.',
    type: 'ROOMMATE',
    intent: 'SEEK',
    location: 'Downtown Toronto',
    budget: 800,
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    authorName: 'Sarah Chen',
  },
  {
    id: '2',
    title: 'Room Available in Shared House',
    body: 'Large furnished room available in a 4-bedroom house. We\'re three engineering students, pretty chill. House has laundry, parking, and a nice backyard. Looking for someone who\'s tidy and friendly!',
    type: 'ROOMMATE',
    intent: 'OFFER',
    location: 'North York',
    budget: 750,
    createdAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    authorName: 'Mike Johnson',
  },
  {
    id: '3',
    title: 'Summer Sublet Available (May-Aug)',
    body: 'Subletting my 1BR apartment for the summer while I\'m away for an internship. Fully furnished, utilities included, great location near campus and shops. Perfect for summer students or interns!',
    type: 'SUBLET',
    intent: 'OFFER',
    location: 'Midtown',
    budget: 1200,
    startDate: '2025-05-01',
    endDate: '2025-08-31',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    authorName: 'Alex Rivera',
  },
  {
    id: '4',
    title: 'Need Sublet for Winter Term',
    body: 'Looking for a sublet from January to April while I\'m on co-op. Prefer something close to campus, furnished if possible. Budget flexible for the right place. Non-smoker, no pets.',
    type: 'SUBLET',
    intent: 'SEEK',
    location: 'Near Campus',
    budget: 900,
    startDate: '2026-01-01',
    endDate: '2026-04-30',
    createdAt: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
    authorName: 'Jordan Lee',
  },
  {
    id: '5',
    title: 'Short-term Housing Available (2 months)',
    body: 'Private room available for 2 months starting immediately. Perfect for visiting students or those between leases. Quiet neighborhood, easy transit access. All utilities and WiFi included.',
    type: 'SHORT_TERM',
    intent: 'OFFER',
    location: 'East End',
    budget: 950,
    startDate: '2025-01-15',
    endDate: '2025-03-15',
    createdAt: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    authorName: 'Taylor Brown',
  },
  {
    id: '6',
    title: 'Looking for Short-term (6 weeks)',
    body: 'Need temporary housing for 6 weeks while my apartment is being renovated. Clean, respectful tenant with references. Okay with sharing. Please reach out if you have anything available!',
    type: 'SHORT_TERM',
    intent: 'SEEK',
    location: 'Anywhere in City',
    budget: 800,
    startDate: '2025-02-01',
    endDate: '2025-03-15',
    createdAt: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    authorName: 'Pat Wilson',
  },
  {
    id: '7',
    title: 'Question: Best neighborhoods for students?',
    body: 'Hi everyone! I\'m moving to the city for grad school this fall. What neighborhoods would you recommend for students? Looking for somewhere safe, affordable, and with good transit connections. Any advice appreciated!',
    type: 'QA',
    intent: null,
    location: 'General',
    createdAt: Date.now() - 8 * 60 * 60 * 1000, // 8 hours ago
    authorName: 'Chris Martinez',
  },
  {
    id: '8',
    title: 'Q: How to find reliable roommates?',
    body: 'First time looking for roommates. What are the best practices? Any red flags I should watch out for? How do you usually split utilities and handle conflicts? Thanks in advance!',
    type: 'QA',
    intent: null,
    createdAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    authorName: 'Anonymous',
  },
  {
    id: '9',
    title: 'Room in 3BR Apartment - Female Roommates',
    body: 'We\'re two female grad students looking for a third roommate. Nice apartment with updated kitchen, in-unit laundry, and balcony. We enjoy cooking together and movie nights. Looking for someone chill and considerate!',
    type: 'ROOMMATE',
    intent: 'OFFER',
    location: 'West End',
    budget: 850,
    createdAt: Date.now() - 10 * 60 * 60 * 1000, // 10 hours ago
    authorName: 'Emma & Lisa',
  },
  {
    id: '10',
    title: 'Sublet my Studio for 3 months',
    body: 'Going abroad for research. Subletting my cozy studio apartment downtown. Fully furnished with everything you need. Building has gym and study rooms. Perfect for a student who wants their own space.',
    type: 'SUBLET',
    intent: 'OFFER',
    location: 'Downtown',
    budget: 1400,
    startDate: '2025-03-01',
    endDate: '2025-05-31',
    createdAt: Date.now() - 15 * 60 * 60 * 1000, // 15 hours ago
    authorName: 'David Kim',
  },
  {
    id: '11',
    title: 'Question: Average rent prices?',
    body: 'What\'s the typical rent range for a room in a shared apartment in this city? Trying to budget for next semester. Also, do most places include utilities or are they separate? Thanks!',
    type: 'QA',
    intent: null,
    createdAt: Date.now() - 20 * 60 * 60 * 1000, // 20 hours ago
    authorName: 'Sam Thompson',
  },
  {
    id: '12',
    title: 'Need place ASAP - 1 month',
    body: 'Emergency situation - need short-term housing for about 1 month starting next week. Responsible tenant, can provide references. Any leads appreciated!',
    type: 'SHORT_TERM',
    intent: 'SEEK',
    location: 'Any',
    budget: 1000,
    startDate: '2025-01-10',
    endDate: '2025-02-10',
    createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    authorName: 'Anonymous',
  },
];

export const PostsProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);

  const addPost = (post: Post) => {
    setPosts((prevPosts) => [post, ...prevPosts]); // New posts at the top
  };

  const getPostById = (id: string) => {
    return posts.find((post) => post.id === id);
  };

  return (
    <PostsContext.Provider value={{ posts, addPost, getPostById }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePostsStore = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePostsStore must be used within a PostsProvider');
  }
  return context;
};


