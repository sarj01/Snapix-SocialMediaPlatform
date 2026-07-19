export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  is_private: boolean;
  is_creator: boolean;
  verified: boolean;
  interests: string[];
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  location: string | null;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: string;
  position: number;
  alt_text: string | null;
}

export interface PostWithProfile extends Post {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'verified'> | null;
  post_media: PostMedia[];
  likes: { user_id: string }[];
  comments: { id: string }[];
  saved?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
  replies?: Comment[];
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: string;
  text: string | null;
  background: string | null;
  created_at: string;
  expires_at: string;
}

export interface StoryWithProfile extends Story {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
  story_views: { user_id: string }[];
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  audio_name: string | null;
  created_at: string;
}

export interface ReelWithProfile extends Reel {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'verified'> | null;
  reel_likes: { user_id: string }[];
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_id: string | null;
  entity_type: string | null;
  read: boolean;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'verified'> | null;
}

export interface Interest {
  id: string;
  name: string;
  emoji: string | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Draft {
  id: string;
  user_id: string;
  caption: string | null;
  media: { url: string; type: string }[];
  created_at: string;
}
