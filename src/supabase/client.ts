/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Accessing environment variables
let rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://") && rawUrl !== "YOUR_SUPABASE_URL") {
  rawUrl = `https://${rawUrl}.supabase.co`;
}
const supabaseUrl = rawUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl !== "YOUR_SUPABASE_URL" && supabaseAnonKey && supabaseAnonKey !== "YOUR_SUPABASE_KEY" && supabaseAnonKey !== "");

if (!isSupabaseConfigured) {
  console.info(
    "%cSupabase configuration is missing. Operating in high-fidelity Durable Local Storage mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to connect to your real Supabase instance. Run the schema in supabase_schema.sql on your Supabase dashboard first!",
    "color: #3b82f6; font-weight: bold; font-size: 11px;"
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Pub/Sub for real-time listener simulation in offline mode
class SimplePubSub {
  private channels: Record<string, Function[]> = {};

  subscribe(channel: string, callback: Function) {
    if (!this.channels[channel]) {
      this.channels[channel] = [];
    }
    this.channels[channel].push(callback);
    return () => {
      this.channels[channel] = this.channels[channel].filter((cb) => cb !== callback);
    };
  }

  publish(channel: string, data: any) {
    if (this.channels[channel]) {
      this.channels[channel].forEach((cb) => cb(data));
    }
  }
}

export const pubsub = new SimplePubSub();

// Helper to get/set items in local storage
export const localDb = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const val = localStorage.getItem(`fb_clone_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T) {
    try {
      localStorage.setItem(`fb_clone_${key}`, JSON.stringify(value));
      // Notify real-time subscribers
      pubsub.publish(key, value);
    } catch (err) {
      console.error(`Error saving ${key} to local storage:`, err);
    }
  },
};
