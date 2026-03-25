export interface Book {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  genre?: string | null;
  subtitle?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
