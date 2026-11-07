import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Plus } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { TagChip } from './tag-chip';
import type { TagApi } from '../types';

type TagsFieldProps = { editable: boolean; tags: string[]; savedTags?: string[]; api: TagApi; onFocus: () => void };

export function TagsField({ editable, tags, savedTags, api, onFocus }: TagsFieldProps) {
  const colors = useTheme();
  const { stacked, iconScale } = useAdaptiveLayout();
  const iconSize = 13 * iconScale;
  const hasDraft = api.draft !== '';

  return (
    <View style={stacked ? styles.tagsRowStacked : styles.tagsRow}>
      <Text style={[styles.statusText, !stacked && styles.tagsLabel, { color: colors.muted }]}>Tags</Text>
      <View style={stacked ? styles.tagsWrapStacked : styles.tagsWrap}>
        {editable ? (
          <>
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} onRemove={() => api.remove(tag)} />
            ))}
            <View
              style={[
                styles.tagAddPill,
                { borderColor: hasDraft ? colors.text : colors.muted, borderStyle: hasDraft ? 'solid' : 'dashed' },
              ]}
            >
              {!hasDraft && <Plus size={iconSize} color={colors.muted as string} />}
              <BottomSheetTextInput
                style={[styles.tagInput, { color: colors.text }]}
                placeholder="Add tag"
                placeholderTextColor={colors.muted}
                value={api.draft}
                onChangeText={api.change}
                onKeyPress={api.keyPress}
                onSubmitEditing={() => api.commit(api.draft)}
                onBlur={() => api.commit(api.draft)}
                onFocus={onFocus}
                submitBehavior="submit"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </>
        ) : savedTags?.length ? (
          savedTags.map((tag) => <TagChip key={tag} label={tag} />)
        ) : (
          <Text style={[styles.value, { color: colors.muted }]}>--</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusText: { fontSize: 14, fontFamily: 'Courier', flexShrink: 0 },
  value: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  tagsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagsRowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  tagsLabel: { paddingVertical: 2 },
  tagsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginLeft: 20 },
  tagsWrapStacked: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center', gap: 6 },
  tagAddPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  tagInput: { minWidth: 48, padding: 0, fontSize: 13, fontFamily: 'Courier', fontWeight: '600' },
});