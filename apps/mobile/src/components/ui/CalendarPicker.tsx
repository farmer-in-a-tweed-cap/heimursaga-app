import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono, colors as brandColors } from '@/theme/tokens';

export function fmtDateISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function fmtDateDisplay(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayISO() {
  const n = new Date();
  return fmtDateISO(n.getFullYear(), n.getMonth(), n.getDate());
}

interface CalendarPickerProps {
  visible: boolean;
  value?: string;          // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  minDate?: string;        // YYYY-MM-DD
  maxDate?: string;        // YYYY-MM-DD
}

export function CalendarPicker({ visible, value, onSelect, onClose, minDate, maxDate }: CalendarPickerProps) {
  const { colors } = useTheme();
  const initial = value
    ? { y: +value.split('-')[0], m: +value.split('-')[1] - 1 }
    : { y: new Date().getFullYear(), m: new Date().getMonth() };
  const [month, setMonth] = useState(initial.m);
  const [year, setYear] = useState(initial.y);

  // Reset to relevant month when opened
  React.useEffect(() => {
    if (visible) {
      if (value) {
        setYear(+value.split('-')[0]);
        setMonth(+value.split('-')[1] - 1);
      } else {
        const n = new Date();
        setYear(n.getFullYear());
        setMonth(n.getMonth());
      }
    }
  }, [visible, value]);

  if (!visible) return null;

  const today = todayISO();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={s.header}>
            <TouchableOpacity onPress={prevMonth} style={s.arrow}>
              <Text style={[s.arrowText, { color: colors.text }]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[s.title, { color: colors.text }]}>
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={s.arrow}>
              <Text style={[s.arrowText, { color: colors.text }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={[s.dow, { color: colors.textTertiary }]}>{d}</Text>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.cell} />;
                const ds = fmtDateISO(year, month, day);
                const isSelected = ds === value;
                const isToday = ds === today;
                const disabled = !!(minDate && ds < minDate) || !!(maxDate && ds > maxDate);
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      s.cell,
                      isSelected && { backgroundColor: brandColors.copper, borderRadius: 20 },
                      isToday && !isSelected && { borderWidth: 1, borderColor: brandColors.copper, borderRadius: 20 },
                    ]}
                    onPress={() => { onSelect(ds); onClose(); }}
                    disabled={disabled}
                  >
                    <Text style={[
                      s.day,
                      { color: disabled ? colors.textTertiary : isSelected ? '#fff' : colors.text },
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={s.cancel} onPress={onClose}>
            <Text style={[s.cancelText, { color: colors.textTertiary }]}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { width: 320, borderRadius: 12, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  arrow: { padding: 8 },
  arrowText: { fontFamily: mono, fontSize: 18, fontWeight: '700' },
  title: { fontFamily: mono, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  row: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontFamily: mono, fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 14, fontWeight: '500' },
  cancel: { alignSelf: 'center', marginTop: 12, padding: 8 },
  cancelText: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
});
