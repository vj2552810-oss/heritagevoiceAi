import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  region: text("region").notNull().default("Konkan & Sahyadri"),
  preferredLanguage: text("preferred_language").notNull().default("Marathi"),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  bio: text("bio").default("Community cultural archivist and dialect contributor."),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dialectWords = pgTable("dialect_words", {
  id: serial("id").primaryKey(),
  localWord: text("local_word").notNull(),
  pronunciation: text("pronunciation").notNull(),
  meaning: text("meaning").notNull(),
  standardLanguageMeaning: text("standard_language_meaning").notNull(),
  englishMeaning: text("english_meaning").notNull(),
  exampleSentence: text("example_sentence").notNull(),
  audioUrl: text("audio_url").default(""),
  region: text("region").notNull(),
  dialectName: text("dialect_name").notNull().default("Malvani / Konkani"),
  contributorId: integer("contributor_id"),
  contributorName: text("contributor_name").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const folkStories = pgTable("folk_stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  storyType: text("story_type").notNull().default("Folk Story"), // 'Folk Story' | 'Village Legend' | 'Traditional Story' | 'Proverb' | 'Traditional Song' | 'Oral History' | 'Voice Recording'
  originalText: text("original_text").notNull(),
  standardTranslation: text("standard_translation").notNull(),
  englishTranslation: text("english_translation").notNull(),
  marathiTranslation: text("marathi_translation").default(""),
  kannadaTranslation: text("kannada_translation").default(""),
  hindiTranslation: text("hindi_translation").default(""),
  aiSummary: text("ai_summary").notNull(),
  category: text("category").notNull(),
  region: text("region").notNull(),
  keywords: text("keywords").notNull(),
  audioUrl: text("audio_url").default(""),
  contributorId: integer("contributor_id"),
  contributorName: text("contributor_name").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const heritageArchive = pgTable("heritage_archive", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Historical Places, Festivals, Traditional Food, Clothing, Folk Music, Folk Dance, Traditional Occupations, Customs, Religious/Cultural Traditions, Old Photographs, Historical Documents
  description: text("description").notNull(),
  historicalInfo: text("historical_info").notNull(),
  region: text("region").notNull(),
  latitude: doublePrecision("latitude").notNull().default(16.65),
  longitude: doublePrecision("longitude").notNull().default(74.25),
  imageUrl: text("image_url").notNull(),
  audioUrl: text("audio_url").default(""),
  contributorId: integer("contributor_id"),
  contributorName: text("contributor_name").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  userAgent: text("user_agent").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  dataUrl: text("data_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type DialectWord = typeof dialectWords.$inferSelect;
export type FolkStory = typeof folkStories.$inferSelect;
export type HeritageEntry = typeof heritageArchive.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type MediaFile = typeof mediaFiles.$inferSelect;
