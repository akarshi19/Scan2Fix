import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { reportsAPI } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const { width } = Dimensions.get('window');
const ACTIVE   = '#5BA8D4';
const CARD_BG  = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

const ASSET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899',
];

function assetColor(type, allTypes) {
  const idx = allTypes.indexOf(type);
  return ASSET_COLORS[idx >= 0 ? idx % ASSET_COLORS.length : 0];
}

const TABS = [
  { key: 'weekly',  label: 'Weekly',  icon: 'calendar-outline' },
  { key: 'monthly', label: 'Monthly', icon: 'bar-chart-outline' },
  { key: 'yearly',  label: 'Yearly',  icon: 'stats-chart-outline' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ComplaintsAnalysis({ navigation }) {
  const [activeTab, setActiveTab]     = useState('weekly');
  const [weeklyData, setWeeklyData]   = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthLoading, setMonthLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!loading) fetchMonthlyData(selectedYear);
  }, [selectedYear]);

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
    } catch (e) {
      console.error('Monthly fetch error:', e);
    } finally {
      setMonthLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // WEEKLY chart: stacked bars per day
  // weeklyData shape: { days: [{label:'Mon 13/4', total:5, byType:{...}},...], assetTypes:['AC',...], totalComplaints:N }
  // ─────────────────────────────────────────────────────
  const renderWeekly = () => {
    if (!weeklyData) return <ActivityIndicator color={ACTIVE} style={{ marginTop: 40 }} />;

    const { days = [], assetTypes = [], totalComplaints = 0 } = weeklyData;
    const maxVal = Math.max(...days.map(d => d.total), 1);
    const chartW = width - 48;
    const chartH = 180;
    const barArea = chartW / days.length;
    const barW = barArea * 0.55;
    const labelArea = 24;
    const yPad = 10;

    const allTypes = assetTypes.length > 0 ? assetTypes : ['Other'];

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Last 7 Days</Text>
        <View style={s.summaryPill}>
          <Ionicons name="document-text-outline" size={16} color={ACTIVE} />
          <Text style={s.summaryText}> {totalComplaints} total complaints this week</Text>
        </View>

        {/* Bar chart */}
        <View style={s.chartCard}>
          <Svg width={chartW} height={chartH + labelArea + 10}>
            <Defs>
              <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={ACTIVE} stopOpacity="0.9" />
                <Stop offset="1" stopColor={ACTIVE} stopOpacity="0.4" />
              </LinearGradient>
            </Defs>

            {/* Horizontal guide lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = yPad + (1 - frac) * chartH;
              return (
                <Line key={i} x1={0} y1={y} x2={chartW} y2={y}
                  stroke="#E8F0F5" strokeWidth={1} />
              );
            })}

            {/* Bars */}
            {days.map((day, di) => {
              const cx = barArea * di + barArea / 2;
              const x  = cx - barW / 2;

              // Stacked segments per assetType
              let stackY = chartH + yPad;
              return allTypes.map((type, ti) => {
                const count = day.byType?.[type] || 0;
                const segH = maxVal > 0 ? (count / maxVal) * chartH : 0;
                stackY -= segH;
                return (
                  <Rect key={`${di}-${ti}`}
                    x={x} y={stackY} width={barW} height={segH}
                    fill={assetColor(type, allTypes)}
                    rx={ti === allTypes.length - 1 ? 4 : 0}
                  />
                );
              });
            })}

            {/* Day labels */}
            {days.map((day, di) => {
              const cx = barArea * di + barArea / 2;
              const parts = day.label.split(' ');
              return (
                <SvgText key={di}
                  x={cx} y={chartH + yPad + 16}
                  textAnchor="middle" fontSize={9} fill={TEXT_MUT}
                >
                  {parts[0]}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* Day totals row */}
        <View style={s.dayRow}>
          {days.map((day, di) => (
            <View key={di} style={s.dayCell}>
              <Text style={s.dayCellNum}>{day.total}</Text>
              <Text style={s.dayCellLabel}>{day.label.split(' ')[0]}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <LegendBlock types={allTypes} />
      </View>
    );
  };

  // ─────────────────────────────────────────────────────
  // MONTHLY chart: horizontal bars per month
  // monthlyData shape: { year, months:[{month:1, total:8, byType:{...}},...], assetTypes:[], total:N }
  // ─────────────────────────────────────────────────────
  const renderMonthly = () => {
    if (monthLoading || (!monthlyData && loading)) {
      return <ActivityIndicator color={ACTIVE} style={{ marginTop: 40 }} />;
    }
    if (!monthlyData) return <Text style={s.emptyText}>No data available</Text>;

    const { months = [], assetTypes = [], total = 0 } = monthlyData;
    const maxVal = Math.max(...months.map(m => m.total), 1);
    const allTypes = assetTypes.length > 0 ? assetTypes : ['Other'];
    const chartW = width - 80;

    return (
      <View style={s.section}>
        {/* Year picker */}
        <View style={s.yearRow}>
          <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={s.yearBtn}>
            <Ionicons name="chevron-back" size={18} color={ACTIVE} />
          </TouchableOpacity>
          <Text style={s.yearLabel}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear(y => y + 1)}
            style={[s.yearBtn, selectedYear >= new Date().getFullYear() && { opacity: 0.3 }]}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            <Ionicons name="chevron-forward" size={18} color={ACTIVE} />
          </TouchableOpacity>
        </View>

        <View style={s.summaryPill}>
          <Ionicons name="document-text-outline" size={16} color={ACTIVE} />
          <Text style={s.summaryText}> {total} total complaints in {selectedYear}</Text>
        </View>

        {/* Horizontal bar chart */}
        <View style={s.chartCard}>
          {months.map((m, mi) => {
            const barMaxW = chartW;
            const barTotalW = maxVal > 0 ? (m.total / maxVal) * barMaxW : 0;
            return (
              <View key={mi} style={s.hBarRow}>
                <Text style={s.hBarLabel}>{MONTHS[(m.month || mi + 1) - 1]}</Text>
                <View style={s.hBarTrack}>
                  {allTypes.map((type, ti) => {
                    const count = m.byType?.[type] || 0;
                    const segW = maxVal > 0 ? (count / maxVal) * barMaxW : 0;
                    if (segW < 1) return null;
                    return (
                      <View key={ti}
                        style={{
                          width: segW, height: 14,
                          backgroundColor: assetColor(type, allTypes),
                          borderRadius: ti === 0 ? 7 : 0,
                        }}
                      />
                    );
                  })}
                </View>
                <Text style={s.hBarCount}>{m.total}</Text>
              </View>
            );
          })}
        </View>

        <LegendBlock types={allTypes} />
      </View>
    );
  };

  // ─────────────────────────────────────────────────────
  // YEARLY chart: grouped bars per year
  // yearlyData: [{year:2024, total:42, byType:{...}},...], shape with assetTypes array
  // ─────────────────────────────────────────────────────
  const renderYearly = () => {
    if (!yearlyData || yearlyData.length === 0) {
      return <Text style={s.emptyText}>No yearly data available</Text>;
    }

    // Collect all asset types across years
    const allTypes = [...new Set(yearlyData.flatMap(y =>
      Object.keys(y.byType || {})
    ))];

    const chartW = width - 48;
    const chartH = 180;
    const barArea = chartW / yearlyData.length;
    const barW = barArea * 0.55;
    const yPad = 10;
    const maxVal = Math.max(...yearlyData.map(y => y.total), 1);
    const grandTotal = yearlyData.reduce((s, y) => s + y.total, 0);

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>All Years</Text>
        <View style={s.summaryPill}>
          <Ionicons name="document-text-outline" size={16} color={ACTIVE} />
          <Text style={s.summaryText}> {grandTotal} total complaints recorded</Text>
        </View>

        <View style={s.chartCard}>
          <Svg width={chartW} height={chartH + 24 + 10}>
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
              const y = yPad + (1 - frac) * chartH;
              return (
                <Line key={i} x1={0} y1={y} x2={chartW} y2={y}
                  stroke="#E8F0F5" strokeWidth={1} />
              );
            })}

            {yearlyData.map((yr, yi) => {
              const cx = barArea * yi + barArea / 2;
              const x  = cx - barW / 2;
              let stackY = chartH + yPad;
              return allTypes.map((type, ti) => {
                const count = yr.byType?.[type] || 0;
                const segH = maxVal > 0 ? (count / maxVal) * chartH : 0;
                stackY -= segH;
                return (
                  <Rect key={`${yi}-${ti}`}
                    x={x} y={stackY} width={barW} height={segH}
                    fill={assetColor(type, allTypes)}
                    rx={ti === allTypes.length - 1 ? 4 : 0}
                  />
                );
              });
            })}

            {yearlyData.map((yr, yi) => {
              const cx = barArea * yi + barArea / 2;
              return (
                <SvgText key={yi}
                  x={cx} y={chartH + yPad + 16}
                  textAnchor="middle" fontSize={9} fill={TEXT_MUT}
                >
                  {yr.year}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* Year total cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
        >
          {yearlyData.map((yr, yi) => (
            <View key={yi} style={s.yearCard}>
              <Text style={s.yearCardYear}>{yr.year}</Text>
              <Text style={s.yearCardCount}>{yr.total}</Text>
              <Text style={s.yearCardSub}>complaints</Text>
            </View>
          ))}
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
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: assetColor(type, types) }]} />
            <Text style={s.legendLabel}>{type}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScreenLayout title="Complaint Analysis" 
    //onBack={() => navigation.goBack()} 
    showBack showDecor>
      {/* Tab selector */}
      <View style={s.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon} size={15}
              color={activeTab === tab.key ? '#FFF' : TEXT_SEC}
            />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={ACTIVE} />
          <Text style={s.loadingText}>Loading report data…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {activeTab === 'weekly'  && renderWeekly()}
          {activeTab === 'monthly' && renderMonthly()}
          {activeTab === 'yearly'  && renderYearly()}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: CARD_BG,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  tabBtnActive: { backgroundColor: ACTIVE },
  tabLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SEC },
  tabLabelActive: { color: '#FFF' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 60 },
  loadingText: { color: TEXT_MUT, fontSize: 13 },

  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRI, marginBottom: 10 },

  summaryPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${ACTIVE}15`, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16, gap: 4,
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: ACTIVE },

  chartCard: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },

  dayRow: {
    flexDirection: 'row', marginBottom: 12,
  },
  dayCell: { flex: 1, alignItems: 'center' },
  dayCellNum: { fontSize: 14, fontWeight: '800', color: TEXT_PRI },
  dayCellLabel: { fontSize: 10, color: TEXT_MUT, marginTop: 2 },

  // Horizontal bar chart
  hBarRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, gap: 8,
  },
  hBarLabel: { width: 30, fontSize: 11, color: TEXT_SEC, fontWeight: '600' },
  hBarTrack: {
    flex: 1, height: 14, borderRadius: 7,
    backgroundColor: '#F0F6FA',
    flexDirection: 'row', overflow: 'hidden',
  },
  hBarCount: { width: 28, fontSize: 11, color: TEXT_SEC, textAlign: 'right', fontWeight: '600' },

  // Year picker
  yearRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16, alignSelf: 'center' },
  yearBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${ACTIVE}15`, alignItems: 'center', justifyContent: 'center',
  },
  yearLabel: { fontSize: 18, fontWeight: '800', color: TEXT_PRI, minWidth: 60, textAlign: 'center' },

  // Yearly cards
  yearCard: {
    backgroundColor: CARD_BG, borderRadius: 12, padding: 14,
    alignItems: 'center', minWidth: 80,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  yearCardYear: { fontSize: 12, color: TEXT_MUT, fontWeight: '600' },
  yearCardCount: { fontSize: 28, fontWeight: '800', color: ACTIVE, marginVertical: 2 },
  yearCardSub: { fontSize: 10, color: TEXT_MUT },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: '500' },

  emptyText: { color: TEXT_MUT, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
