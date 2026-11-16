import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { atHoustonTime, formatDay, formatTime, houstonDayStart } from '@/lib/format';

import { Chip, Label } from './ui';

const TIME_SLOTS: [number, number][] = [
  [10, 0],
  [12, 0],
  [14, 0],
  [16, 0],
  [17, 30],
  [19, 0],
  [20, 30],
];

function nextDays(count: number) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => houstonDayStart(now, i));
}

// Day chips for the next week plus time-of-day chips. Calls onChange with the
// chosen time in ms, or null until both a day and a time are picked.
export function TimePicker({ dayLabel, onChange }: { dayLabel: string; onChange: (time: number | null) => void }) {
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);

  const timeFor = (d: number, s: [number, number]) => atHoustonTime(d, s[0], s[1]);
  const open = TIME_SLOTS.filter((s) => timeFor(day, s) > Date.now() + 30 * 60000);

  return (
    <>
      <View style={styles.section}>
        <Label>{dayLabel}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {days.map((d) => (
            <Chip
              key={d}
              label={formatDay(d)}
              selected={day === d}
              onPress={() => {
                setDay(d);
                setSlot(null);
                onChange(null);
              }}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.section}>
        <Label>PICK A TIME</Label>
        {open.length === 0 ? (
          <Text style={styles.empty}>No times left today. Pick another day.</Text>
        ) : (
          <View style={styles.wrap}>
            {open.map((s) => {
              const key = s.join(':');
              return (
                <Chip
                  key={key}
                  label={formatTime(timeFor(day, s))}
                  selected={slot === key}
                  onPress={() => {
                    setSlot(key);
                    onChange(timeFor(day, s));
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  row: { gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  empty: { ...Typography.body, color: Colors.textSecondary },
});
