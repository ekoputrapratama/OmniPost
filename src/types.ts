export interface Post {
  id: string;
  userId: string;
  content: string;
  platforms: string[];
  mediaUrls?: string[];
  status: "pending" | "publishing" | "published" | "failed" | "scheduled";
  scheduledFor?: string;
  createdAt: string;
  publishedAt?: string;
  error?: string;
}
