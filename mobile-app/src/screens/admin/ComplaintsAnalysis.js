import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Modal, FlatList, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { reportsAPI, complaintsAPI } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const { width } = Dimensions.get('window');

const ACTIVE   = '#5BA8D4';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

const PALETTE = [
  { base: '#FF6B6B', light: '#FFCDD2' },
  { base: '#26C6DA', light: '#B2EBF2' },
  { base: '#FFA726', light: '#FFE0B2' },
  { base: '#AB47BC', light: '#E1BEE7' },
  { base: '#66BB6A', light: '#C8E6C9' },
  { base: '#5C6BC0', light: '#C5CAE9' },
  { base: '#EC407A', light: '#F8BBD0' },
  { base: '#26A69A', light: '#B2DFDB' },
];

function palIdx(type, allTypes) {
  const i = allTypes.indexOf(type);
  return (i >= 0 ? i : 0) % PALETTE.length;
}
function baseColor(type, allTypes) {
  return PALETTE[palIdx(type, allTypes)].base;
}

const TABS = [
  { key: 'weekly',  label: 'Weekly',  icon: 'calendar-outline'   },
  { key: 'monthly', label: 'Monthly', icon: 'bar-chart-outline'   },
  { key: 'yearly',  label: 'Yearly',  icon: 'stats-chart-outline' },
];

const TABS_KEYS = ['weekly', 'monthly', 'yearly'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS = {
  OPEN: '#FF6B6B', ASSIGNED: '#FFA726', IN_PROGRESS: ACTIVE,
  FINISHING: '#AB47BC', RESOLVED: '#66BB6A', CLOSED: '#4CAF50',
};
function statusColor(st) { return STATUS_COLORS[st] || TEXT_MUT; }

export default function ComplaintsAnalysis() {
  const [activeTab, setActiveTab]       = useState('weekly');
  const [weeklyData, setWeeklyData]     = useState(null);
  const [monthlyData, setMonthlyData]   = useState(null);
  const [yearlyData, setYearlyData]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthLoading, setMonthLoading] = useState(false);
  const [weekOffset, setWeekOffset]     = useState(0);
  const [weekLoading, setWeekLoading]   = useState(false);
  const weekMounted = useRef(false);

  // Drill-down modal state
  const [drillVisible, setDrillVisible]       = useState(false);
  const [drillTitle, setDrillTitle]           = useState('');
  const [drillComplaints, setDrillComplaints] = useState([]);
  const [drillLoading, setDrillLoading]       = useState(false);

  useEffect(() => { fetchAllData(); }, []);
  useEffect(() => { if (!loading) fetchMonthlyData(selectedYear); }, [selectedYear]);
  useEffect(() => {
    if (!weekMounted.current) { weekMounted.current = true; return; }
    fetchWeeklyForOffset(weekOffset);
  }, [weekOffset]);

  const getWeekEndDate = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    return d.toISOString();
  };

  const getWeekRangeLabel = (offset) => {
    const end = new Date();
    end.setDate(end.getDate() + offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmt = d => `${d.getDate()} ${MN[d.getMonth()]}`;
    return offset === 0 ? `This week  ${fmt(start)}–${fmt(end)}` : `${fmt(start)} – ${fmt(end)}`;
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [wRes, mRes, yRes] = await Promise.all([
        reportsAPI.weekly(),
        reportsAPI.monthly(selectedYear),
        reportsAPI.yearly(),
      ]);
      if (wRes.data.success) setWeeklyData(wRes.data.data);
      if (mRes.data.success) setMonthlyData(mRes.data.data);
      if (yRes.data.success) setYearlyData(yRes.data.data || []);
    } catch (e) {
      console.error('Complaints analysis error:', e);
      Alert.alert('Error', 'Failed to load complaint reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async (year) => {
    setMonthLoading(true);
    try {
      const res = await reportsAPI.monthly(year);
      if (res.data.success) setMonthlyData(res.data.data);
    } catch (e) { console.error('Monthly fetch error:', e); }
    finally { setMonthLoading(false); }
  };

  const fetchWeeklyForOffset = async (offset) => {
    setWeekLoading(true);
    try {
      const res = await reportsAPI.weekly(getWeekEndDate(offset));
      if (res.data.success) setWeeklyData(res.data.data);
    } catch (e) { console.error('Weekly fetch error:', e); }
    finally { setWeekLoading(false); }
  };

  // ─── Drill-down: fetch complaints for a time range ───
  const openDrill = async (title, dateFrom, dateTo) => {
    setDrillTitle(title);
    setDrillVisible(true);
    setDrillLoading(true);
    setDrillComplaints([]);
    try {
      const res = await complaintsAPI.getAll({ dateFrom, dateTo });
      if (res.data.success) setDrillComplaints(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Could not load complaints for this period');
    } finally {
      setDrillLoading(false);
    }
  };

  // ─── Swipe-to-switch-tab PanResponder ───
  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx, vx }) => {
        if (Math.abs(dx) < 60 && Math.abs(vx) < 0.4) return;
        setActiveTab(prev => {
          const idx = TABS_KEYS.indexOf(prev);
          return dx < 0
            ? TABS_KEYS[Math.min(idx + 1, TABS_KEYS.length - 1)]
            : TABS_KEYS[Math.max(idx - 1, 0)];
        });
      },
    })
  ).current;

  // ─────────────────────────────────────────────────────────
  // WEEKLY — stacked gradient bars
  // ─────────────────────────────────────────────────────────
  const renderWeekly = () => {
    if (!weeklyData && !weekLoading) return <ActivityIndicator color={ACTIVE} style={{ marginTop: 40 }} />;

    const { days = [], assetTypes = [], totalComplaints = 0 } = weeklyData || {};
    const allTypes = assetTypes.length > 0 ? assetTypes : [];
    const maxVal   = Math.max(...days.map(d => d.total), 1);
    const chartW   = width - 48;
    const chartH   = 200;
    const yAxisW   = 28;
    const availW   = chartW - yAxisW;
    const barArea  = availW / Math.max(days.length, 1);
    const barW     = barArea * 0.72;
    const yPad     = 28;
    const labelH   = 34;

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();

    return (
      <View style={s.section}>

        {/* ── Week navigator ── */}
        <View style={s.weekNavRow}>
          <TouchableOpacity style={s.weekNavBtn} onPress={() => setWeekOffset(o => o - 1)}>
            <Ionicons name="chevron-back" size={18} color={ACTIVE} />
          </TouchableOpacity>
          <View style={s.weekNavCenter}>
            {weekLoading
              ? <ActivityIndicator color={ACTIVE} size="small" />
              : <Text style={s.weekNavLabel}>{getWeekRangeLabel(weekOffset)}</Text>
            }
          </View>
          <TouchableOpacity
            style={[s.weekNavBtn, weekOffset >= 0 && { opacity: 0.3 }]}
            onPress={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
          >
            <Ionicons name="chevron-forward" size={18} color={ACTIVE} />
          </TouchableOpacity>
        </View>

        <View style={s.chipRow}>
          <View style={s.chipPrimary}>
            <Ionicons name="trending-up-outline" size={13} color={ACTIVE} />
            <Text style={s.chipPrimaryText}>{totalComplaints} complaint{totalComplaints !== 1 ? 's' : ''} this period</Text>
          </View>
        </View>

        <View style={s.chartCard}>
          <Svg width={chartW} height={chartH + yPad + labelH}>
            <Defs>
              {PALETTE.map((pal, i) => (
                <LinearGradient key={i} id={`wg${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pal.base}  stopOpacity="1"   />
                  <Stop offset="1" stopColor={pal.light} stopOpacity="0.6" />
                </LinearGradient>
              ))}
              <LinearGradient id="wgEmpty" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#E8F2F8" stopOpacity="1" />
                <Stop offset="1" stopColor="#F5F9FC" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Dashed guide lines */}
            {[0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = yPad + (1 - frac) * chartH;
              return (
                <React.Fragment key={i}>
                  <Line x1={yAxisW} y1={y} x2={chartW} y2={y}
                    stroke="#EEF4F8" strokeWidth={1} strokeDasharray="3,4" />
                  <SvgText x={0} y={y + 4} fontSize={8} fill={TEXT_MUT}>
                    {Math.round(frac * maxVal)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Baseline */}
            <Line x1={yAxisW} y1={yPad + chartH} x2={chartW} y2={yPad + chartH}
              stroke="#DDE8EE" strokeWidth={1.5} />

            {days.map((day, di) => {
              const cx      = yAxisW + (barArea * di) + barArea / 2;
              const x       = cx - barW / 2;
              const isToday = day.date === todayStr;
              let   stackY  = yPad + chartH;
              let   topY    = yPad + chartH;

              const segments = allTypes.map((type, ti) => {
                const count = day.byType?.[type] || 0;
                if (count === 0) return null;
                const segH = (count / maxVal) * chartH;
                stackY -= segH;
                topY = stackY;
                return (
                  <Rect key={ti} x={x} y={stackY} width={barW} height={segH}
                    fill={`url(#wg${palIdx(type, allTypes)})`} />
                );
              }).filter(Boolean);

              return (
                <React.Fragment key={di}>
                  {isToday && (
                    <Rect x={x - 5} y={yPad} width={barW + 10} height={chartH}
                      fill={`${ACTIVE}12`} rx={8} />
                  )}
                  {day.total === 0 && (
                    <Rect x={x} y={yPad} width={barW} height={chartH}
                      fill="url(#wgEmpty)" rx={6} />
                  )}

                  {segments}

                  {day.total > 0 && (() => {
                    const topType = allTypes.find(t => (day.byType?.[t] || 0) > 0) || allTypes[0];
                    return (
                      <Rect x={x} y={topY} width={barW} height={7}
                        fill={baseColor(topType, allTypes)} rx={4} />
                    );
                  })()}

                  {day.total > 0 && (
                    <SvgText x={cx} y={Math.max(topY - 5, 12)}
                      textAnchor="middle" fontSize={11} fontWeight="bold" fill={TEXT_PRI}>
                      {day.total}
                    </SvgText>
                  )}

                  <SvgText x={cx} y={yPad + chartH + 16}
                    textAnchor="middle" fontSize={10}
                    fill={isToday ? ACTIVE : TEXT_SEC}
                    fontWeight={isToday ? 'bold' : 'normal'}>
                    {day.label.split(' ')[0]}
                  </SvgText>
                  <SvgText x={cx} y={yPad + chartH + 28}
                    textAnchor="middle" fontSize={8} fill={isToday ? ACTIVE : TEXT_MUT}>
                    {day.label.split(' ')[1] || ''}
                  </SvgText>

                  {/* Transparent tap target over the entire bar column */}
                  <Rect
                    x={x - 4} y={yPad} width={barW + 8} height={chartH}
                    fill="transparent"
                    onPress={() => {
                      // UTC boundaries — report groups by UTC day, so filter must match
                      openDrill(day.label, day.date + 'T00:00:00.000Z', day.date + 'T23:59:59.999Z');
                    }}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Day totals strip — tappable */}
        <View style={s.dayStrip}>
          {days.map((day, di) => {
            const isToday = day.date === todayStr;
            return (
              <TouchableOpacity
                key={di}
                style={[s.dayStripCell, isToday && s.dayStripToday]}
                activeOpacity={0.7}
                onPress={() => {
                  openDrill(day.label, day.date + 'T00:00:00.000Z', day.date + 'T23:59:59.999Z');
                }}
              >
                <Text style={[s.dayStripNum, { color: isToday ? ACTIVE : TEXT_PRI }]}>
                  {day.total}
                </Text>
                <Text style={[s.dayStripLabel, { color: isToday ? ACTIVE : TEXT_MUT }]}>
                  {day.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <LegendBlock types={allTypes} />
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // MONTHLY — horizontal bars (RN Views) — tappable rows
  // ─────────────────────────────────────────────────────────
  const renderMonthly = () => {
    if (monthLoading || (!monthlyData && loading)) {
      return <ActivityIndicator color={ACTIVE} style={{ marginTop: 40 }} />;
    }
    if (!monthlyData) return <Text style={s.emptyText}>No data available</Text>;

    const { months = [], assetTypes = [], total = 0 } = monthlyData;
    const allTypes = assetTypes.length > 0 ? assetTypes : [];
    const maxVal   = Math.max(...months.map(m => m.total), 1);
    const topMonth = [...months].sort((a, b) => b.total - a.total)[0];

    return (
      <View style={s.section}>
        <View style={s.yearPickerRow}>
          <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={s.yearNavBtn}>
            <Ionicons name="chevron-back" size={18} color={ACTIVE} />
          </TouchableOpacity>
          <View style={s.yearLabelWrap}>
            <Text style={s.yearLabelMain}>{selectedYear}</Text>
            <Text style={s.yearLabelSub}>{total} complaints total</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedYear(y => y + 1)}
            style={[s.yearNavBtn, selectedYear >= new Date().getFullYear() && { opacity: 0.3 }]}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            <Ionicons name="chevron-forward" size={18} color={ACTIVE} />
          </TouchableOpacity>
        </View>

        {topMonth && topMonth.total > 0 && (
          <View style={s.peakBadge}>
            <Ionicons name="flame-outline" size={13} color="#FF6B6B" />
            <Text style={s.peakBadgeText}>
              Peak: {MONTHS[(topMonth.month || 1) - 1]} with {topMonth.total} complaints
            </Text>
          </View>
        )}

        <View style={s.chartCard}>
          {months.map((m, mi) => {
            const isPeak = topMonth && m.month === topMonth.month && m.total > 0;
            return (
              <TouchableOpacity
                key={mi}
                style={s.hBarRow}
                activeOpacity={0.7}
                onPress={() => {
                  // UTC month boundaries — report uses $month which is UTC-based
                  const mo      = m.month || mi + 1;
                  const fromStr = `${selectedYear}-${String(mo).padStart(2,'0')}-01T00:00:00.000Z`;
                  const nextMo  = mo === 12 ? 1 : mo + 1;
                  const nextYr  = mo === 12 ? selectedYear + 1 : selectedYear;
                  const toDate  = new Date(`${nextYr}-${String(nextMo).padStart(2,'0')}-01T00:00:00.000Z`);
                  toDate.setMilliseconds(toDate.getMilliseconds() - 1);
                  openDrill(`${MONTHS[mo - 1]} ${selectedYear}`, fromStr, toDate.toISOString());
                }}
              >
                <Text style={[s.hBarLabel, isPeak && s.hBarLabelPeak]}>
                  {MONTHS[(m.month || mi + 1) - 1]}
                </Text>
                <View style={s.hBarTrack}>
                  {m.total > 0 ? allTypes.map((type, ti) => {
                    const count = m.byType?.[type] || 0;
                    if (count === 0) return null;
                    return (
                      <View key={ti} style={{
                        flex: count / maxVal,
                        height: '100%',
                        backgroundColor: baseColor(type, allTypes),
                        borderTopLeftRadius:    ti === 0 ? 9 : 0,
                        borderBottomLeftRadius: ti === 0 ? 9 : 0,
                      }} />
                    );
                  }).filter(Boolean) : (
                    <View style={s.hBarEmpty} />
                  )}
                </View>
                <View style={[s.hBarBadge, isPeak && s.hBarBadgePeak]}>
                  <Text style={[s.hBarBadgeText, isPeak && s.hBarBadgeTextPeak]}>
                    {m.total}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <LegendBlock types={allTypes} />
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // YEARLY — stacked gradient bars
  // ─────────────────────────────────────────────────────────
  const renderYearly = () => {
    if (!yearlyData || yearlyData.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <Ionicons name="stats-chart-outline" size={52} color={TEXT_MUT} />
          <Text style={s.emptyText}>No yearly data available</Text>
        </View>
      );
    }

    const allTypes   = [...new Set(yearlyData.flatMap(y => Object.keys(y.byType || {})))];
    const maxVal     = Math.max(...yearlyData.map(y => y.total), 1);
    const grandTotal = yearlyData.reduce((s, y) => s + y.total, 0);
    const avgPerYear = Math.round(grandTotal / yearlyData.length);
    const chartW     = width - 48;
    const chartH     = 200;
    const barArea    = chartW / Math.max(yearlyData.length, 1);
    const barW       = Math.min(barArea * 0.52, 52);
    const yPad       = 28;
    const labelH     = 22;

    return (
      <View style={s.section}>
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Ionicons name="document-text-outline" size={13} color={ACTIVE} />
            <Text style={s.statChipText}>{grandTotal} total</Text>
          </View>
          <View style={[s.statChip, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="analytics-outline" size={13} color="#FFA726" />
            <Text style={[s.statChipText, { color: '#FFA726' }]}>{avgPerYear}/yr avg</Text>
          </View>
          <View style={[s.statChip, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="calendar-outline" size={13} color="#66BB6A" />
            <Text style={[s.statChipText, { color: '#66BB6A' }]}>
              {yearlyData.length} yr{yearlyData.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={s.chartCard}>
          <Svg width={chartW} height={chartH + yPad + labelH}>
            <Defs>
              {PALETTE.map((pal, i) => (
                <LinearGradient key={i} id={`yg${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pal.base}  stopOpacity="1"   />
                  <Stop offset="1" stopColor={pal.light} stopOpacity="0.6" />
                </LinearGradient>
              ))}
            </Defs>

            {[0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = yPad + (1 - frac) * chartH;
              return (
                <React.Fragment key={i}>
                  <Line x1={28} y1={y} x2={chartW} y2={y}
                    stroke="#EEF4F8" strokeWidth={1} strokeDasharray="3,4" />
                  <SvgText x={0} y={y + 4} fontSize={8} fill={TEXT_MUT}>
                    {Math.round(frac * maxVal)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Line x1={28} y1={yPad + chartH} x2={chartW} y2={yPad + chartH}
              stroke="#DDE8EE" strokeWidth={1.5} />

            {yearlyData.map((yr, yi) => {
              const cx     = 28 + (barArea * yi) + barArea / 2;
              const x      = cx - barW / 2;
              let stackY   = yPad + chartH;
              let topY     = yPad + chartH;

              const segments = allTypes.map((type, ti) => {
                const count = yr.byType?.[type] || 0;
                if (count === 0) return null;
                const segH = (count / maxVal) * chartH;
                stackY -= segH;
                topY = stackY;
                return (
                  <Rect key={ti} x={x} y={stackY} width={barW} height={segH}
                    fill={`url(#yg${palIdx(type, allTypes)})`} />
                );
              }).filter(Boolean);

              return (
                <React.Fragment key={yi}>
                  {segments}

                  {yr.total > 0 && (() => {
                    const topType = allTypes.find(t => (yr.byType?.[t] || 0) > 0) || allTypes[0];
                    return (
                      <Rect x={x} y={topY} width={barW} height={7}
                        fill={baseColor(topType, allTypes)} rx={4} />
                    );
                  })()}

                  {yr.total > 0 && (
                    <SvgText x={cx} y={Math.max(topY - 5, 12)}
                      textAnchor="middle" fontSize={11} fontWeight="bold" fill={TEXT_PRI}>
                      {yr.total}
                    </SvgText>
                  )}

                  <SvgText x={cx} y={yPad + chartH + 16}
                    textAnchor="middle" fontSize={10} fill={TEXT_SEC} fontWeight="600">
                    {yr.year}
                  </SvgText>

                  {/* Transparent tap target over the entire bar column */}
                  <Rect
                    x={x - 4} y={yPad} width={barW + 8} height={chartH}
                    fill="transparent"
                    onPress={() => {
                      // UTC year boundaries — report uses $year which is UTC-based
                      const yearEnd = new Date(`${yr.year + 1}-01-01T00:00:00.000Z`);
                      yearEnd.setMilliseconds(yearEnd.getMilliseconds() - 1);
                      openDrill(`${yr.year} complaints`, `${yr.year}-01-01T00:00:00.000Z`, yearEnd.toISOString());
                    }}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        <View style={s.drillHint}>
          <Ionicons name="arrow-down-circle-outline" size={12} color={TEXT_MUT} />
          <Text style={s.drillHintText}>Tap a year card to view its monthly breakdown</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {yearlyData.map((yr, yi) => {
            const pct = grandTotal > 0 ? Math.round((yr.total / grandTotal) * 100) : 0;
            return (
              <TouchableOpacity
                key={yi}
                style={s.yearCard}
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedYear(yr.year);
                  setActiveTab('monthly');
                }}
              >
                <Text style={s.yearCardYear}>{yr.year}</Text>
                <Text style={s.yearCardCount}>{yr.total}</Text>
                <Text style={s.yearCardSub}>{pct}% of all</Text>
                <View style={s.yearCardDrill}>
                  <Ionicons name="bar-chart-outline" size={10} color={ACTIVE} />
                  <Text style={s.yearCardDrillText}>Monthly</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <LegendBlock types={allTypes} />
      </View>
    );
  };

  function LegendBlock({ types }) {
    if (!types || types.length === 0) return null;
    return (
      <View style={s.legend}>
        {types.map((type, i) => (
          <View key={i} style={[s.legendPill, { backgroundColor: `${baseColor(type, types)}1A` }]}>
            <View style={[s.legendDot, { backgroundColor: baseColor(type, types) }]} />
            <Text style={[s.legendLabel, { color: baseColor(type, types) }]}>{type}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScreenLayout title="Complaint Analysis" showBack showDecor>
      <View style={{ flex: 1 }} {...swipePan.panHandlers}>
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={14}
                color={activeTab === tab.key ? '#FFF' : TEXT_SEC} />
              <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={ACTIVE} />
            <Text style={s.loadingText}>Loading reports…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}>
            {activeTab === 'weekly'  && renderWeekly()}
            {activeTab === 'monthly' && renderMonthly()}
            {activeTab === 'yearly'  && renderYearly()}
          </ScrollView>
        )}
      </View>

      {/* ── Drill-down Modal ── */}
      <Modal
        visible={drillVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDrillVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{drillTitle}</Text>
              <TouchableOpacity onPress={() => setDrillVisible(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={TEXT_SEC} />
              </TouchableOpacity>
            </View>
            {drillLoading ? (
              <ActivityIndicator color={ACTIVE} style={{ marginTop: 32 }} />
            ) : drillComplaints.length === 0 ? (
              <View style={s.drillEmptyWrap}>
                <Ionicons name="clipboard-outline" size={40} color={TEXT_MUT} />
                <Text style={s.drillEmpty}>No complaints in this period</Text>
              </View>
            ) : (
              <>
                <Text style={s.drillCount}>{drillComplaints.length} complaint{drillComplaints.length !== 1 ? 's' : ''}</Text>
                <FlatList
                  data={drillComplaints}
                  keyExtractor={item => (item.id || item._id)?.toString()}
                  renderItem={({ item }) => (
                    <View style={s.drillItem}>
                      <View style={s.drillItemLeft}>
                        <Text style={s.drillItemType}>{item.asset_type}</Text>
                        <Text style={s.drillItemDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={s.drillItemMeta}>{item.station}{item.location ? ` · ${item.location}` : ''}</Text>
                      </View>
                      <View style={[s.drillItemBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
                        <Text style={[s.drillItemStatus, { color: statusColor(item.status) }]}>
                          {item.status?.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  // ── Tabs ──────────────────────────────────────────────────
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  tabBtnActive:   { backgroundColor: ACTIVE },
  tabLabel:       { fontSize: 12, fontWeight: '600', color: TEXT_SEC },
  tabLabelActive: { color: '#FFF' },

  // ── Loading ───────────────────────────────────────────────
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 60 },
  loadingText: { color: TEXT_MUT, fontSize: 13 },

  // ── Section + chart card ──────────────────────────────────
  section: { marginBottom: 8 },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 10,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },

  // ── Week navigator ───────────────────────────────────────
  weekNavRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 6,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  weekNavBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${ACTIVE}15`, alignItems: 'center', justifyContent: 'center',
  },
  weekNavCenter: { flex: 1, alignItems: 'center', minHeight: 20, justifyContent: 'center' },
  weekNavLabel: { fontSize: 13, fontWeight: '700', color: TEXT_PRI, textAlign: 'center' },

  // ── Weekly summary chip ───────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chipPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${ACTIVE}18`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  chipPrimaryText: { fontSize: 12, fontWeight: '700', color: ACTIVE },

  // ── Day totals strip ──────────────────────────────────────
  dayStrip: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  dayStripCell: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    backgroundColor: '#F5F9FC', borderRadius: 10,
  },
  dayStripToday: {
    backgroundColor: `${ACTIVE}15`,
    borderWidth: 1.5, borderColor: `${ACTIVE}35`,
  },
  dayStripNum:   { fontSize: 14, fontWeight: '800' },
  dayStripLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // ── Monthly year picker ───────────────────────────────────
  yearPickerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 24, marginBottom: 12,
  },
  yearNavBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${ACTIVE}15`, alignItems: 'center', justifyContent: 'center',
  },
  yearLabelWrap: { alignItems: 'center' },
  yearLabelMain: { fontSize: 22, fontWeight: '800', color: TEXT_PRI },
  yearLabelSub:  { fontSize: 11, color: TEXT_MUT, marginTop: 1 },

  // ── Peak month badge ──────────────────────────────────────
  peakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#FFCDD2',
  },
  peakBadgeText: { fontSize: 12, fontWeight: '600', color: '#FF6B6B' },

  // ── Horizontal bars ───────────────────────────────────────
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hBarLabel:     { width: 34, fontSize: 11, fontWeight: '600', color: TEXT_SEC },
  hBarLabelPeak: { color: '#FF6B6B', fontWeight: '800' },
  hBarTrack: {
    flex: 1, height: 18, borderRadius: 9,
    backgroundColor: '#F0F6FA', flexDirection: 'row', overflow: 'hidden',
  },
  hBarEmpty: { width: 4, height: '100%', backgroundColor: '#DDE8EE', borderRadius: 9 },
  hBarBadge: {
    width: 32, height: 22, borderRadius: 7,
    backgroundColor: `${ACTIVE}15`, alignItems: 'center', justifyContent: 'center',
  },
  hBarBadgePeak:     { backgroundColor: '#FF6B6B' },
  hBarBadgeText:     { fontSize: 11, fontWeight: '700', color: ACTIVE },
  hBarBadgeTextPeak: { color: '#FFF' },

  // ── Yearly stats chips ────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: `${ACTIVE}15`, paddingVertical: 9, borderRadius: 12,
  },
  statChipText: { fontSize: 11, fontWeight: '700', color: ACTIVE },

  // ── Yearly summary cards ──────────────────────────────────
  yearCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', minWidth: 88,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  yearCardYear:  { fontSize: 12, fontWeight: '600', color: TEXT_MUT },
  yearCardCount: { fontSize: 32, fontWeight: '800', color: ACTIVE, marginVertical: 3 },
  yearCardSub:   { fontSize: 10, color: TEXT_MUT },
  yearCardDrill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 6, backgroundColor: `${ACTIVE}15`,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  yearCardDrillText: { fontSize: 9, fontWeight: '700', color: ACTIVE },

  drillHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8,
  },
  drillHintText: { fontSize: 11, color: TEXT_MUT, fontStyle: 'italic' },

  // ── Legend pills ──────────────────────────────────────────
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  legendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },

  // ── Empty ─────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: TEXT_MUT, textAlign: 'center', fontSize: 14 },

  // ── Drill-down modal ──────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F5F9FC', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRI, flex: 1 },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF4F8', alignItems: 'center', justifyContent: 'center',
  },
  drillCount: { fontSize: 12, color: TEXT_MUT, marginBottom: 12 },
  drillItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  drillItemLeft: { flex: 1, marginRight: 10 },
  drillItemType: { fontSize: 11, fontWeight: '700', color: ACTIVE, marginBottom: 2 },
  drillItemDesc: { fontSize: 13, color: TEXT_PRI, marginBottom: 3 },
  drillItemMeta: { fontSize: 11, color: TEXT_MUT },
  drillItemBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center',
  },
  drillItemStatus: { fontSize: 10, fontWeight: '700' },
  drillEmptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  drillEmpty: { color: TEXT_MUT, fontSize: 14 },
});
