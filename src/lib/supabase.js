import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gjcedrdwepwqjpebbmoq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqY2VkcmR3ZXB3cWpwZWJibW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTg4MzAsImV4cCI6MjA5NzA3NDgzMH0.5ssrFStWgeq8csJYZIuCJY1-BLwMTlpztdtTM4HDfV4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── TASK FUNCTIONS ────────────────────────────────────────────────────────────

export async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertTasks(tasks, userId) {
  const rows = tasks.map(t => ({
    user_id: userId,
    text: t.text,
    priority: t.priority,
    category: t.category,
    done: t.done || false,
  }));
  const { data, error } = await supabase.from('tasks').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateTask(id, updates) {
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
