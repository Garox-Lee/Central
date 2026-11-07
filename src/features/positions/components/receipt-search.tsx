import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Search, X, Star, Check, Trash2 } from 'lucide-react-native';
import { Receipt } from '@/features/receipt';
import { buildSuggestions, filterLabel, SearchFilter, Suggestion } from '../utils/receipt-search';

type Props = {
  receipts: Receipt[]; // used only to build suggestions
  filters: SearchFilter[]; // committed tokens, owned by the parent
  onChange: (filters: SearchFilter[]) => void;
  countMatches?: (filters: SearchFilter[]) => number; // entries matching a filter set (for the favourite rows)
};

type Favourite = { id: string; name: string; filters: SearchFilter[] };

const keyOf = (fs: SearchFilter[]) =>
  fs.map((f) => `${f.id}${f.negate ? '!' : ''}`).sort().join('|');

const MUTED = '#888';
const POS = '#5b9dfa'; // blue
const NEG = '#f2696e'; // red
const SURFACE = 'rgba(128, 128, 128, 0.18)';

const ROW_H = 40;
const DROPDOWN_GAP = 6;
const MAX_FAV_LIST = 8; // max favourites shown when tapping the star with nothing searched

export default function ReceiptSearch({ receipts, filters, onChange, countMatches }: Props) {
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState<string>('');
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [naming, setNaming] = useState<boolean>(false);
  const [armed, setArmed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState<boolean>(false);

  useEffect(() => {
    supabase
      .schema('users')
      .from('favourite_filters')
      .select('id,name,filters')
      .order('created_at')
      .then(({ data }) => {
        if (data) setFavourites(data as Favourite[]);
      });
  }, []);

  const negate = query.startsWith('-');
  const term = negate ? query.slice(1) : query;

  // favourites list opened via the star: only while nothing is typed, no filters, and not naming
  const listOpen = showFavs && !naming && query.length === 0 && filters.length === 0;

  const found = useMemo(() => buildSuggestions(receipts, term, filters), [receipts, term, filters]);
  const suggestions = naming || listOpen ? [] : found;

  const favRows = listOpen
    ? favourites.slice(0, MAX_FAV_LIST)
    : !naming && !negate && term.length > 0
    ? favourites.filter((f) => f.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5)
    : [];

  const emptyFavs = listOpen && favourites.length === 0;

  const activeFav =
    filters.length > 0 ? favourites.find((f) => keyOf(f.filters) === keyOf(filters)) : undefined;

  // trash can is armed for one favourite only; any change to the filters disarms it
  useEffect(() => {
    setArmed(false);
  }, [activeFav?.id]);

  // auto-disarm after 3 seconds
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const n = favRows.length + suggestions.length + (error ? 1 : 0) + (emptyFavs ? 1 : 0);
  const dropdownHeight = n > 0 ? DROPDOWN_GAP + 2 + n * ROW_H + (n - 1) * StyleSheet.hairlineWidth : 0;

  const commit = (s: Suggestion) => {
    onChange([...filters, { ...s.filter, negate }]);
    setQuery('');
    setShowFavs(false);
  };

  const applyFavourite = (f: Favourite) => {
    onChange(f.filters);
    setQuery('');
    setShowFavs(false);
  };

  const saveFavourite = async () => {
    if (filters.length === 0) {
      setNaming(false);
      setError(null);
      setQuery('');
      return;
    }

    const name = query.trim();

    if (!name) {
      setError('Please enter a name for this favourite.');
      inputRef.current?.focus();
      return;
    }

    if (favourites.some((f) => f.name.trim().toLowerCase() === name.toLowerCase())) {
      setError(`A favourite called "${name}" already exists. Try a different name.`);
      inputRef.current?.focus();
      return;
    }

    const { data, error: dbError } = await supabase
      .schema('users')
      .from('favourite_filters')
      .insert({ name, filters })
      .select('id,name,filters')
      .single();

    if (dbError) {
      setError('Could not save favourite. Please try again.');
      return;
    }

    if (data) setFavourites((p) => [...p, data as Favourite]);
    setError(null);
    setNaming(false);
    setQuery('');
  };

  const deleteFavourite = async (id: string) => {
    const { error: dbError } = await supabase
      .schema('users')
      .from('favourite_filters')
      .delete()
      .eq('id', id);
    if (!dbError) setFavourites((p) => p.filter((f) => f.id !== id));
  };

  const onStar = () => {
    if (naming) return saveFavourite();

    // nothing searched: the star toggles the saved favourites list
    if (filters.length === 0) {
      setShowFavs((v) => !v);
      return;
    }

    if (activeFav) {
      if (armed) {
        deleteFavourite(activeFav.id);
        setArmed(false);
      } else {
        setArmed(true);
      }
      return;
    }
    setQuery('');
    setError(null);
    setShowFavs(false);
    setNaming(true);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (naming) return saveFavourite();
    if (query && favRows[0]) return applyFavourite(favRows[0]);
    if (suggestions[0]) commit(suggestions[0]);
  };

  const removeFilter = (id: string) => onChange(filters.filter((f) => f.id !== id));

  const toggleFilter = (id: string) =>
    onChange(filters.map((f) => (f.id === id ? { ...f, negate: !f.negate } : f)));

  const clearAll = () => {
    setQuery('');
    setError(null);
    setShowFavs(false);
    onChange([]);
  };

  const cancelNaming = () => {
    setNaming(false);
    setError(null);
    setQuery('');
  };

  const hasInput = query.length > 0 || filters.length > 0;

  return (
    <View style={[styles.wrap, { marginBottom: -dropdownHeight }]}>
      <View
        style={[
          styles.bar,
          { borderColor: error ? NEG : colors.border, backgroundColor: SURFACE },
        ]}
      >
        <TouchableOpacity
          onPress={onStar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            naming
              ? 'Save favourite'
              : filters.length === 0
              ? listOpen
                ? 'Hide favourites'
                : 'Show favourites'
              : activeFav
              ? armed
                ? 'Confirm delete favourite'
                : 'Delete favourite'
              : 'Save as favourite'
          }
        >
          {naming ? (
            <Check size={16} color={POS} />
          ) : activeFav && armed ? (
            <Trash2 size={16} color={NEG} />
          ) : (
            <Star
              size={16}
              color={activeFav || listOpen ? POS : MUTED}
              fill={activeFav || listOpen ? POS : 'none'}
            />
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <Search size={16} color={MUTED} />

        {filters.map((f) => {
          const c = f.negate ? NEG : POS;
          return (
            <View key={f.id} style={[styles.token, { backgroundColor: `${c}22` }]}>
              <TouchableOpacity
                onPress={() => toggleFilter(f.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Toggle include or exclude for ${filterLabel(f)}`}
              >
                <Text style={[styles.tokenText, { color: c }]}>
                  {f.negate ? '≠ ' : ''}
                  {filterLabel(f)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeFilter(f.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${filterLabel(f)}`}
              >
                <X size={12} color={c} />
              </TouchableOpacity>
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (error) setError(null);
            if (showFavs) setShowFavs(false);
          }}
          onSubmitEditing={submit}
          onKeyPress={({ nativeEvent }) => {
            // backspace on an empty box removes the last token
            if (nativeEvent.key === 'Backspace' && query === '' && filters.length > 0 && !naming) {
              onChange(filters.slice(0, -1));
            }
          }}
          placeholder={naming ? 'Name favourite' : filters.length > 0 ? 'Add filter' : 'Search receipts'}
          placeholderTextColor={MUTED}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={naming ? 'done' : 'search'}
          blurOnSubmit={false}
          style={[styles.input, { color: colors.text }]}
        />

        {hasInput && (
          <TouchableOpacity
            onPress={naming ? cancelNaming : clearAll}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={naming ? 'Cancel naming' : 'Clear search'}
          >
            <X size={16} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {n > 0 && (
        <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={{ backgroundColor: SURFACE }}>
            {error && (
              <View style={[styles.suggestion, { gap: 6 }]}>
                <X size={14} color={NEG} />
                <Text style={[styles.suggestionLabel, { color: NEG }]} numberOfLines={1}>
                  {error}
                </Text>
              </View>
            )}

            {emptyFavs && (
              <View style={styles.suggestion}>
                <Text style={[styles.suggestionLabel, { color: MUTED }]} numberOfLines={1}>
                  No favourites yet
                </Text>
              </View>
            )}

            {favRows.map((f, i) => {
              const count = countMatches?.(f.filters);
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => applyFavourite(f)}
                  activeOpacity={0.7}
                  style={[styles.suggestion, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <Text style={styles.group}>Favourite</Text>
                  <Text style={[styles.suggestionLabel, { color: POS }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  {count !== undefined && <Text style={styles.count}>{count}</Text>}
                </TouchableOpacity>
              );
            })}

            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => commit(s)}
                activeOpacity={0.7}
                style={[styles.suggestion, favRows.length + i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Text style={styles.group}>{s.group}</Text>
                <Text style={[styles.suggestionLabel, { color: negate ? NEG : POS }]} numberOfLines={1}>
                  {negate
                    ? s.filter.kind === 'text'
                      ? s.label.replace('Contains', 'Does not contain')
                      : `≠ ${s.label}`
                    : s.label}
                </Text>
                {s.count !== undefined && <Text style={styles.count}>{s.count}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },

  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  input: { flex: 1, minWidth: 90, fontSize: 14, fontFamily: 'Courier', paddingVertical: 4 },
  divider: { width: 1, height: 20, marginHorizontal: 2, backgroundColor: MUTED, opacity: 0.7 },

  token: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  tokenText: { fontSize: 13, fontFamily: 'Courier', fontWeight: '600' },

  dropdown: { marginTop: DROPDOWN_GAP, borderWidth: 1, borderRadius: 8, overflow: 'hidden', elevation: 8 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, height: ROW_H, paddingHorizontal: 10 },
  group: { width: 84, fontSize: 11, fontFamily: 'Courier', color: MUTED },
  suggestionLabel: { flex: 1, fontSize: 14, fontFamily: 'Courier' },
  count: { fontSize: 12, fontFamily: 'Courier', color: MUTED },
});