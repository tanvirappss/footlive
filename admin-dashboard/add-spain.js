const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkikuysbirrcmbextkvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraWt1eXNiaXJyY21iZXh0a3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODIzNDEsImV4cCI6MjA5Njc1ODM0MX0.eNrSGZFdjNEoy1OE1w9Zj3OwyIw1lZCRdOHIRiP-IBA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const matchId = '70a993e4-6ebb-4fc2-9438-8da68e2de271'; // From previous log
  
  const { error } = await supabase
    .from('streams')
    .insert({
      match_id: matchId,
      stream_name: 'ADMIN 1 HD',
      primary_url: 'https://streamed.pk/watch/spain-vs-belgium-2519345/admin/1'
    });
    
  if (error) {
    console.error('Failed to insert stream:', error);
  } else {
    console.log('Successfully added Spain vs Belgium stream!');
  }
}

run();
