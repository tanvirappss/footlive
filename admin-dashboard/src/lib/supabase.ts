import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkikuysbirrcmbextkvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraWt1eXNiaXJyY21iZXh0a3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODIzNDEsImV4cCI6MjA5Njc1ODM0MX0.eNrSGZFdjNEoy1OE1w9Zj3OwyIw1lZCRdOHIRiP-IBA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        cache: 'no-store',
      });
    },
  },
});
