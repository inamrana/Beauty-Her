import { getSupabaseClient } from '@/template';

export async function getGlowUpProgress(userId: string, planType: string): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('glow_up_progress')
    .select('day_number, task_index')
    .eq('user_id', userId)
    .eq('plan_type', planType)
    .eq('completed', true);

  if (error) throw error;

  const completed = new Set<string>();
  (data ?? []).forEach(row => completed.add(`${row.day_number}_${row.task_index}`));
  return completed;
}

export async function toggleGlowUpTask(
  userId: string,
  planType: string,
  dayNumber: number,
  taskIndex: number,
  completed: boolean
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('glow_up_progress')
    .upsert(
      {
        user_id: userId,
        plan_type: planType,
        day_number: dayNumber,
        task_index: taskIndex,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,plan_type,day_number,task_index' }
    );

  if (error) throw error;
}
