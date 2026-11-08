import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Keyboard, Platform, StyleSheet, TextInput, TouchableOpacity, View, type KeyboardEvent } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useUserDetails } from '@/context/user-context';
import type { CounterpartyOption } from './components/counterparty-picker-modal';
import { formatDatetime } from '@/utils/datetime';
import { getReceiptStatus, getTotalQuantity } from './utils/receipts';
import { formatCurrency, qtyColor } from '@/utils/format-numbers';
import { AppText as Text } from '@/components/app-text';
import SegmentedControl from '@/components/segmented-control';
import { QrScannerModal } from '@/components/qr-scanner-modal';

import ReceiptHistory from './components/receipt-history';
import { NoteField } from './components/note-field';
import { TagsField } from './components/tags-field';
import { CounterpartyField } from './components/counterparty-field';
import { LegsView } from './components/legs-view';
import { DatetimeView } from './components/datetime-view';
import { AggregateView } from './components/aggregate-view';
import { ReceiptActions } from './components/receipt-actions';
import { ReceiptDialogs } from './components/receipt-dialogs';
import { VIEW_MODES, FMT } from './constants';
import { useReceiptForm } from './hooks/use-receipt-form';
import { useReceiptActions } from './hooks/use-receipt-actions';
import { useCounterpartyLink } from './hooks/use-counterparty-link';
import { useHistoryPage } from './hooks/use-history-page';
import type { Props, ViewMode } from './types';
import { getCapabilities, isBlankReceipt } from './utils/capabilities';
import { pickDateTimeAndroid } from './utils/platform-pickers';
import { useReceiptHistory } from './utils/receipt-history';
import { validateReceipt } from './utils/validation';
import { Palette } from '@/constants/theme';

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
);

const HANDLE_ALLOWANCE = 30; // space the sheet's drag handle takes at the top of the expanded sheet
const REVEAL_MARGIN = 16; // gap between the focused input and the top of the keyboard

const NO_OPTIONS: CounterpartyOption[] = [];

export default function ReceiptDetails({
  receipt, onClose, editable: editableProp = false, onSave, onUpdate, onDelete, onConfirm, onDecline, onResolveAmendment, onWithdrawForEdit,
  counterpartyOptions = NO_OPTIONS,
}: Props) {
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const { textScale, stacked, iconScale } = useAdaptiveLayout();
  const { publicId } = useUserDetails();
  const sheetRef = useRef<BottomSheet>(null);
  const [containerH, setContainerH] = useState(0); // the space the sheet lives in, measured

  // ----- sheet -----
  // collapsed height grows with text size so the header stays visible; expanded gets more room when stacked
  const snapPoints = useMemo(() => [`${Math.min(20 * textScale, 60)}%`, stacked ? '92%' : '80%'], [textScale, stacked]);
  // the visible height of the expanded sheet: the pages must be exactly this tall, or they grow with their content and never scroll
  const bodyH = containerH > 0 ? containerH * (stacked ? 0.92 : 0.8) - HANDLE_ALLOWANCE : 0;
  const allowCloseRef = useRef(false); // true when the close is intentional (save, delete, discard)
  const close = useCallback(() => { allowCloseRef.current = true; sheetRef.current?.close(); }, []);
  const expand = useCallback(() => sheetRef.current?.snapToIndex(1), []);

  // ----- keyboard: keep the focused input visible above the keyboard (only this sheet's scroll view moves) -----
  const hostRef = useRef<View>(null);
  const scrollRef = useRef<any>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null); // screen Y where the keyboard starts; null when hidden
  const [keyboardOverlap, setKeyboardOverlap] = useState(0); // how much of the sheet the keyboard covers

  // how much of this sheet the keyboard covers (measured, so tab bars / safe areas are handled)
  useEffect(() => {
    const onChange = (e: KeyboardEvent) => {
      const top = e.endCoordinates.screenY;
      hostRef.current?.measureInWindow((_x, y, _w, h) => {
        const overlap = Math.max(0, y + h - top);
        keyboardTop.current = overlap > 0 ? top : null;
        setKeyboardOverlap(overlap);
      });
    };
    const onHide = () => { keyboardTop.current = null; setKeyboardOverlap(0); };

    const subs = Platform.OS === 'ios'
      ? [Keyboard.addListener('keyboardWillChangeFrame', onChange)] // also fires on hide (overlap becomes 0)
      : [Keyboard.addListener('keyboardDidShow', onChange), Keyboard.addListener('keyboardDidHide', onHide)];
    return () => subs.forEach((s) => s.remove());
  }, []);

  // scroll the focused input so its bottom edge sits just above the keyboard
  const revealFocusedInput = useCallback(() => {
    const kbTop = keyboardTop.current;
    const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (kbTop == null || !input) return;
    input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      const overshoot = y + h + REVEAL_MARGIN - kbTop;
      if (overshoot > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overshoot, animated: true });
    });
  }, []);

  // keyboard just appeared / changed height: wait for the padding to apply, then reveal
  useEffect(() => {
    if (keyboardOverlap === 0) return;
    const t = setTimeout(revealFocusedInput, 150);
    return () => clearTimeout(t);
  }, [keyboardOverlap, revealFocusedInput]);

  // any field in the sheet gained focus: expand, and reveal it (covers moving between legs with the keyboard open)
  const handleFieldFocus = useCallback(() => {
    expand();
    setTimeout(revealFocusedInput, 350); // after the sheet's expand animation
  }, [expand, revealFocusedInput]);

  // ----- ui state -----
  const status = getReceiptStatus(receipt);
  const [mode, setMode] = useState<'view' | 'edit' | 'amend'>('view');
  const isEditing = mode !== 'view';
  const isAmending = mode === 'amend';
  const { events: historyEvents, lastUpdated, pendingAmendment, reload: reloadHistory } = useReceiptHistory(
    receipt.receiptId, receipt.isNegativeParty, !isBlankReceipt(receipt));
  const caps = getCapabilities({ receipt, status, isEditing, isAmending, pendingAmendment, editableProp, hasDelete: !!onDelete });
  const { editable, personalEditable, isBlank } = caps;

  const [viewMode, setViewMode] = useState<ViewMode>(isBlank ? 'legs' : 'datetime');
  const [showPicker, setShowPicker] = useState(false); // inline iOS picker for the receipt date
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState<boolean>(false);

  // ----- form, counterparty, actions, history -----
  const form = useReceiptForm(receipt, isBlank);
  const { values } = form;
  // a live update arrived and I'm not editing: reload the form from it
  useEffect(() => {
    if (!isEditing && !isBlank) form.reset();
  }, [receipt]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pending amendment changed (requested, answered or withdrawn): refresh the timeline and buttons
  const pendingId = receipt.pendingAmendmentId ?? null;
  const seenPendingId = useRef(pendingId);
  useEffect(() => {
    if (seenPendingId.current === pendingId) return;
    seenPendingId.current = pendingId;
    reloadHistory();
  }, [pendingId, reloadHistory]);
  // snapshot of the form as first loaded; any difference counts as an unsaved change
  const initialValuesRef = useRef<string | null>(null);
  if (initialValuesRef.current === null) initialValuesRef.current = JSON.stringify(values);

  const hasUnsavedChanges =
    (isEditing || isBlank) && JSON.stringify(values) !== initialValuesRef.current;
  const link = useCounterpartyLink({
    ownPublicId: publicId,
    linkedId: values.counterpartyPublicId,
    setCounterparty: form.setCounterparty,
    notify: setAlertMessage,
  });
  const actions = useReceiptActions({
    receiptId: receipt.receiptId,
    onSave,
    onUpdate,
    onDelete,
    onConfirm,
    onDecline,
    onResolveAmendment,
    onWithdrawForEdit,
    close,
    notify: setAlertMessage,
  });
  const history = useHistoryPage(expand);

  // Android back button: close the history page if it's open, otherwise close the sheet.
  // sheet.close() goes through handleAnimate, so the unsaved-changes prompt still fires.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.open) history.closeHistory();
      else sheetRef.current?.close();
      return true;
    });
    return () => sub.remove();
  }, [history.open, history.closeHistory]);

  // ----- derived -----
  const effectiveReceipt = useMemo(() => ({ ...receipt, transactions: values.transactions }), [receipt, values.transactions]);
  const audAmount = getTotalQuantity(effectiveReceipt, 'AUD');
  const linked = !!values.counterpartyPublicId;

  // ----- handlers -----
  const handleSave = () => actions.save(form.getSubmission(), validateReceipt(values));
  const handleSaveChanges = () =>
    actions.saveChanges(form.getSubmission(), caps.editable ? validateReceipt(values) : null);

  const startEditing = (next: 'edit' | 'amend') => {
    initialValuesRef.current = JSON.stringify(values); // baseline for the discard prompt
    if (next === 'amend' || caps.canEditShared) setViewMode('legs'); // legs are only editable in this view
    setMode(next);
    expand();
  };
  const handleEdit = () => startEditing('edit');
  const handleAmend = () => startEditing('amend');

  const handleWithdrawAndEdit = async () => {
    if (!pendingAmendment) return;
    const proposal = await actions.withdrawForEdit(pendingAmendment.amendmentId);
    if (!proposal) return;
    reloadHistory(); // the amendment is no longer pending
    form.loadProposal(proposal);
    startEditing('amend');
  };

  const handleCancelEdit = () => {
    form.reset();
    link.disarm();
    setShowPicker(false);
    setMode('view');
    setViewMode('datetime');
  };

  const handleAnimate = (_from: number, to: number) => {
    // to === -1 means the sheet is closing (pan down or backdrop tap)
    if (to !== -1 || allowCloseRef.current || !hasUnsavedChanges || discardOpen) return;
    expand();             // cancel the close and put the sheet back to max height
    setDiscardOpen(true); // show the discard modal
  };

  const handleKeepEditing = () => {
    setDiscardOpen(false);
    expand();
  };

  const handleDiscard = () => {
    setDiscardOpen(false);
    close(); // sets allowCloseRef so the prompt doesn't reappear
  };

  const handlePickCounterparty = (name: string, unregisteredId: string | null) => {
    form.setCounterparty(name, null, unregisteredId);
    link.disarm();
  };

  const openDatePicker = () => {
    if (!editable) return;
    if (Platform.OS === 'android') {
      pickDateTimeAndroid(values.agreementDatetime, (d) => form.set('agreementDatetime', d));
      return;
    }
    setShowPicker((s) => !s);
    expand();
  };

  const smallIcon = 13 * iconScale;

  return (
    <View
      ref={hostRef}
      style={styles.sheetHost}
      pointerEvents="box-none"
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        containerStyle={styles.sheetContainer}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onAnimate={handleAnimate}
        onClose={onClose}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={[styles.slideClip, bodyH > 0 && { flex: 0, height: bodyH }]}>
          <Animated.View
            style={[
              styles.slideTrack,
              { width: history.width * 2, height: bodyH > 0 ? bodyH : undefined, transform: [{ translateX: history.translateX }] },
            ]}
          >
            {/* ───── page 1: receipt details ───── */}
            <View style={{ width: history.width, height: bodyH > 0 ? bodyH : undefined }}>
              {/* key={bodyH}: remount once the real height is known, otherwise it keeps its first (content-sized) layout */}
              <BottomSheetScrollView
                ref={scrollRef}
                key={bodyH}
                style={bodyH > 0 ? { height: bodyH } : styles.scroll}
                contentContainerStyle={[styles.content, keyboardOverlap > 0 && { paddingBottom: 30 + keyboardOverlap }]}
                keyboardShouldPersistTaps="handled"
                onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
              >
                {/* header: date, id, counterparty, total, shared notes */}
                <View style={styles.block}>
                  <View style={styles.headerRow}>
                    <TouchableOpacity activeOpacity={0.7} disabled={!editable} onPress={openDatePicker}>
                      <Text style={{ color: colors.text }}>{formatDatetime(values.agreementDatetime, FMT.full)}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.idText, { color: colors.muted }]}>{isBlank ? '' : receipt.receiptId}</Text>
                  </View>

                  {/* counterparty + total: side by side normally, stacked at large sizes */}
                  <View style={stacked ? styles.counterpartyAndAmountStacked : styles.counterpartyAndAmountRow}>
                    <CounterpartyField
                      receipt={receipt}
                      editable={editable}
                      isEditing={isEditing}
                      name={values.counterpartyName}
                      linkedId={values.counterpartyPublicId}
                      link={link}
                      options={counterpartyOptions}
                      onPick={handlePickCounterparty}
                      onFocus={handleFieldFocus}
                    />
                    <Text style={[styles.amountText, styles.amountNoShrink, { color: qtyColor(audAmount, colors) }]}>
                      {formatCurrency(audAmount)}
                    </Text>
                  </View>

                  <NoteField
                    label="Shared Notes"
                    editable={editable}
                    value={values.sharedNotes}
                    savedValue={receipt.sharedNotes}
                    placeholder="Visible to counterparty"
                    onChange={(t) => form.set('sharedNotes', t)}
                    onFocus={handleFieldFocus}
                  />
                </View>

                {editable && showPicker && Platform.OS === 'ios' && (
                  <DateTimePicker
                    value={values.agreementDatetime}
                    mode="datetime"
                    display="inline"
                    onValueChange={(_, d) => form.set('agreementDatetime', d)}
                    themeVariant={dark ? 'dark' : 'light'}
                    accentColor={colors.primary as string}
                  />
                )}

                <View style={[styles.divider, { borderBottomColor: colors.border }]} />

                {/* metadata: account, tags, personal notes */}
                <View style={styles.block}>
                  <View style={styles.row}>
                    <Text style={[styles.statusText, { color: colors.muted }]}>Account</Text>
                    <Text style={[styles.value, { color: colors.muted }]}>--</Text>
                  </View>

                  <TagsField
                    editable={personalEditable}
                    tags={values.tags}
                    savedTags={receipt.tags}
                    api={form.tagApi}
                    onFocus={handleFieldFocus}
                  />

                  <NoteField
                    label="Personal Notes"
                    editable={personalEditable}
                    value={values.personalNotes}
                    savedValue={receipt.personalNotes}
                    placeholder="Notes that only you can see"
                    onChange={(t) => form.set('personalNotes', t)}
                    onFocus={handleFieldFocus}
                  />
                </View>

                <SegmentedControl options={VIEW_MODES} value={viewMode} onChange={setViewMode} style={styles.viewModeControl} />

                {/* the active view only; the others aren't computed */}
                {viewMode === 'datetime' && <DatetimeView receipt={effectiveReceipt} />}
                {viewMode === 'aggregate' && <AggregateView receipt={effectiveReceipt} />}
                {viewMode === 'legs' && (
                  <LegsView
                    transactions={values.transactions}
                    qtyText={form.qtyText}
                    editable={editable}
                    canAddTransaction={isBlank}
                    ops={form.legOps}
                    onFocus={handleFieldFocus}
                    onAlert={setAlertMessage}
                  />
                )}

                {!isBlank && (
                  <>
                    <View style={[styles.divider, { borderBottomColor: colors.border }]} />
                    <TouchableOpacity style={[styles.row, { marginBottom: 8 }]} activeOpacity={0.7} onPress={history.openHistory}>
                      <Text style={[styles.statusText, { color: colors.muted }]}>Last updated</Text>
                      <View style={styles.lastUpdatedValue}>
                        <Text style={[styles.value, { color: colors.text }]}>
                          {lastUpdated ? formatDatetime(lastUpdated, 'ddd, dd mmm yyyy hh:MM am/pm') : '--'}
                        </Text>
                        <ChevronRight size={smallIcon} color={colors.muted as string} />
                      </View>
                    </TouchableOpacity>

                    {pendingAmendment && (
                      <TouchableOpacity style={[styles.row, { marginBottom: 8 }]} activeOpacity={0.7} onPress={history.openHistory}>
                        <Text style={[styles.statusText, { color: Palette.amber }]}>Amendment</Text>
                        <View style={styles.lastUpdatedValue}>
                          <Text style={[styles.value, { color: colors.text }]}>
                            {pendingAmendment.byMe ? 'Awaiting counterparty' : 'Review changes'}
                          </Text>
                          <ChevronRight size={smallIcon} color={colors.muted as string} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <ReceiptActions
                  caps={caps}
                  isEditing={isEditing}
                  linked={linked}
                  pending={actions.pending}
                  saved={actions.saved}
                  onSave={handleSave}
                  onSaveChanges={handleSaveChanges}
                  onCancelEdit={handleCancelEdit}
                  onConfirm={actions.confirm}
                  onDecline={actions.decline}
                  onResolveAmendment={(outcome) =>
                    pendingAmendment && actions.resolveAmendment(pendingAmendment.amendmentId, outcome)}
                  onAmend={handleAmend}
                  isAmending={isAmending}
                  onEdit={handleEdit}
                  onDelete={actions.openDelete}
                  onWithdrawAndEdit={handleWithdrawAndEdit}
                />

                <ReceiptDialogs
                  deleteOpen={actions.deleteOpen}
                  deleting={actions.pending === 'delete'}
                  deleteError={actions.deleteError}
                  onCloseDelete={actions.closeDelete}
                  onConfirmDelete={actions.confirmDelete}
                  discardOpen={discardOpen}
                  discardingNew={isBlank}
                  onKeepEditing={handleKeepEditing}
                  onConfirmDiscard={handleDiscard}
                  alertMessage={alertMessage}
                  onCloseAlert={() => setAlertMessage(null)}
                />

                <QrScannerModal visible={link.scannerOpen} onClose={link.closeScanner} onScanned={link.onScanned} />
              </BottomSheetScrollView>
            </View>

            {/* ───── page 2: history ───── */}
            <View style={{ width: history.width }}>
              {history.open && <ReceiptHistory receipt={receipt} events={historyEvents} onBack={history.closeHistory} />}
            </View>
          </Animated.View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetHost: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  divider: { borderBottomWidth: 1, marginVertical: 5 },
  block: { flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 8, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetContainer: { zIndex: 100, elevation: 100 },
  slideClip: { flex: 1, overflow: 'hidden' },
  slideTrack: { flex: 1, flexDirection: 'row' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  idText: { fontSize: 14, fontFamily: 'Courier' },
  counterpartyAndAmountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  counterpartyAndAmountStacked: { flexDirection: 'column', gap: 4 },
  amountText: { fontFamily: 'Courier', fontSize: 20, fontWeight: '700' },
  amountNoShrink: { flexShrink: 0 },

  statusText: { fontSize: 14, fontFamily: 'Courier', flexShrink: 0 },
  value: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  lastUpdatedValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  viewModeControl: { marginTop: 20, marginBottom: 10 },
});