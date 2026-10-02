import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { GLOW_UP_7DAY } from '@/services/mockData';
import { useAuth } from '@/template';
import { getGlowUpProgress, toggleGlowUpTask } from '@/services/glowUpService';

type PlanKey = '7day' | '30day' | '90day';

const PLANS: { key: PlanKey; label: string; days: number; desc: string; emoji: string }[] = [
  { key: '7day', label: '7-Day', days: 7, desc: 'Quick glow-up starter', emoji: '🌸' },
  { key: '30day', label: '30-Day', days: 30, desc: 'Real transformation', emoji: '🌟' },
  { key: '90day', label: '90-Day', days: 90, desc: 'Ultimate glow journey', emoji: '💫' },
];

export default function GlowUpScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('7day');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activeDay, setActiveDay] = useState(0);

  React.useEffect(() => {
    if (!authUser) return;
    setCompletedTasks(new Set());
    getGlowUpProgress(authUser.id, selectedPlan)
      .then(progress => setCompletedTasks(progress))
      .catch(err => console.error('Failed to load glow-up progress:', err));
  }, [authUser?.id, selectedPlan]);

  const toggleTask = (taskId: string) => {
    const parts = taskId.split('_');
    const dayNumber = parseInt(parts[0], 10);
    const taskIndex = parseInt(parts[1], 10);
    const isCurrentlyCompleted = completedTasks.has(taskId);
    const nextCompleted = !isCurrentlyCompleted;

    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });

    if (authUser) {
      toggleGlowUpTask(authUser.id, selectedPlan, dayNumber, taskIndex, nextCompleted)
        .catch(err => {
          console.error('Failed to save task progress:', err);
          // Revert on error
          setCompletedTasks(prev => {
            const next = new Set(prev);
            if (isCurrentlyCompleted) next.add(taskId);
            else next.delete(taskId);
            return next;
          });
        });
    }
  };

  const currentDay = GLOW_UP_7DAY[activeDay];
  const allTasks = GLOW_UP_7DAY.flatMap((d, di) => d.tasks.map((_, ti) => `${di}_${ti}`));
  const completedCount = allTasks.filter(id => completedTasks.has(id)).length;
  const progressPct = Math.round((completedCount / allTasks.length) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Glow-Up Plan</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Plan Selector */}
        <View style={styles.planRow}>
          {PLANS.map(p => (
            <Pressable
              key={p.key}
              style={[styles.planBtn, selectedPlan === p.key && styles.planBtnActive]}
              onPress={() => setSelectedPlan(p.key)}
            >
              <Text style={styles.planEmoji}>{p.emoji}</Text>
              <Text style={[styles.planLabel, selectedPlan === p.key && styles.planLabelActive]}>{p.label}</Text>
              <Text style={[styles.planDesc, selectedPlan === p.key && styles.planDescActive]}>{p.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Progress Card */}
        <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressSub}>7-Day Glow-Up Challenge</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressMeta}>{completedCount} of {allTasks.length} tasks completed</Text>
        </LinearGradient>

        {/* Day Selector */}
        <Text style={styles.sectionTitle}>Daily Challenges</Text>
        <View style={{ height: 80 }}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScroll}
          >
            {GLOW_UP_7DAY.map((day, index) => {
              const dayTasks = day.tasks.map((_, ti) => `${index}_${ti}`);
              const dayComplete = dayTasks.every(id => completedTasks.has(id));
              const isActive = activeDay === index;
              return (
                <Pressable
                  key={index}
                  style={[styles.dayBtn, isActive && styles.dayBtnActive, dayComplete && styles.dayBtnDone]}
                  onPress={() => setActiveDay(index)}
                >
                  <Text style={[styles.dayNum, (isActive || dayComplete) && styles.dayNumActive]}>
                    {dayComplete ? '✓' : `${index + 1}`}
                  </Text>
                  <Text style={[styles.dayLabel, (isActive || dayComplete) && styles.dayLabelActive]}>
                    Day {index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Day Detail */}
        {currentDay ? (
          <View style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayCardEmoji}>{currentDay.emoji}</Text>
              <View>
                <Text style={styles.dayCardDay}>Day {activeDay + 1}</Text>
                <Text style={styles.dayCardFocus}>{currentDay.focus}</Text>
              </View>
            </View>
            <Text style={styles.dayCardSubtitle}>Complete all tasks for today:</Text>
            {currentDay.tasks.map((task, taskIndex) => {
              const taskId = `${activeDay}_${taskIndex}`;
              const done = completedTasks.has(taskId);
              return (
                <Pressable
                  key={taskIndex}
                  style={({ pressed }) => [
                    styles.taskRow,
                    done && styles.taskRowDone,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => toggleTask(taskId)}
                >
                  <View style={[styles.taskCheck, done && styles.taskCheckDone]}>
                    {done ? <Ionicons name="checkmark" size={14} color={Colors.textInverse} /> : null}
                  </View>
                  <Text style={[styles.taskText, done && styles.taskTextDone]}>{task}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* All Days Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle2}>Full 7-Day Overview</Text>
          {GLOW_UP_7DAY.map((day, index) => (
            <View key={index} style={styles.overviewRow}>
              <Text style={styles.overviewEmoji}>{day.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewDay}>Day {index + 1} · {day.focus}</Text>
                <Text style={styles.overviewTasks}>{day.tasks.join(' · ')}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.text },
  planRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  planBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: Radius.lg, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  planBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.secondary },
  planEmoji: { fontSize: 20, marginBottom: 3 },
  planLabel: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold, color: Colors.textSecondary },
  planLabelActive: { color: Colors.primary },
  planDesc: { fontSize: 9, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  planDescActive: { color: Colors.primaryLight },
  progressCard: {
    marginHorizontal: Spacing.md, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.lg,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  progressTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textInverse },
  progressSub: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  progressCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  progressPct: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.bold, color: Colors.textInverse },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: '100%', backgroundColor: Colors.textInverse, borderRadius: 4 },
  progressMeta: { fontSize: Fonts.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  sectionTitle: {
    fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold,
    color: Colors.text, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  dayScroll: { paddingHorizontal: Spacing.md, paddingVertical: 8, gap: Spacing.sm, alignItems: 'center' },
  dayBtn: {
    width: 60, height: 64, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  dayBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.secondary },
  dayBtnDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dayNum: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textSecondary },
  dayNumActive: { color: Colors.primary },
  dayLabel: { fontSize: 9, color: Colors.textLight },
  dayLabelActive: { color: Colors.primary },
  dayCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, ...Shadow.md,
  },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  dayCardEmoji: { fontSize: 36 },
  dayCardDay: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: Fonts.weights.medium },
  dayCardFocus: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.text },
  dayCardSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  taskRowDone: { borderBottomColor: Colors.border },
  taskCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  taskCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  taskText: { flex: 1, fontSize: Fonts.sizes.base, color: Colors.text },
  taskTextDone: { textDecorationLine: 'line-through', color: Colors.textLight },
  overviewCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.md, ...Shadow.sm,
  },
  sectionTitle2: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.text, marginBottom: 12 },
  overviewRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  overviewEmoji: { fontSize: 18 },
  overviewDay: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: Colors.text },
  overviewTasks: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
});
