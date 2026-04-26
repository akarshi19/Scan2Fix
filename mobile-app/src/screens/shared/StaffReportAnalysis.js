import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Modal, PanResponder, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Line, Circle, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { reportsAPI, complaintsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ScreenLayout from '../../components/ScreenLayout';

const { width } = Dimensions.get('window');
const ACTIVE   = '#5BA8D4';
const CARD_BG  = '#FFFFFF';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#5A7A8A';
const TEXT_MUT = '#9DB5C0';

// ─────── Asset type display helpers ───────
const TYPE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899',
];
function typeColor(type, idx) {
  const fixed = { AC: '#FF6B6B', WATER_COOLER: '#4ECDC4', DESERT_COOLER: '#FFD93D', LIGHTS: '#A78BFA' };
  return fixed[type] || TYPE_COLORS[idx % TYPE_COLORS.length];
}
function typeLabel(type) {
  const labels = { AC: 'AC', WATER_COOLER: 'Water Cooler', DESERT_COOLER: 'Desert Cooler', LIGHTS: 'Lights' };
  return labels[type] || type.replace(/_/g, ' ');
}

export default function StaffReportAnalysis({ navigation }) {
  const { role } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab]         = useState('staff');
  const [staffData, setStaffData]         = useState([]);
  const [starStaff, setStarStaff]         = useState(null);
  const [monthlyData, setMonthlyData]     = useState(null);
  const [yearlyData, setYearlyData]       = useState([]);
  const [personalStats, setPersonalStats] = useState(null);

  const [loading, setLoading]             = useState(true);
  const [monthLoading, setMonthLoading]   = useState(false);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());

  // Staff picker
  const [showPicker, setShowPicker]       = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  // On mount: load staff + yearly + personal stats
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Re-fetch monthly when year changes — ADMIN only
  useEffect(() => {
    if (role === 'ADMIN') fetchMonthlyData(selectedYear);
  }, [selectedYear]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (role === 'STAFF') {
        // STAFF: only fetch their own report — use this as personalStats too
        const myRes = await reportsAPI.staffMe();
        if (myRes.data.success && myRes.data.data) {
          const d = myRes.data.data;
          setStaffData([d]);
          setSelectedStaffId(d.staffId?.toString());
          // Populate personalStats directly from the report (no second API call needed)
          setPersonalStats({
            total:          d.totalAssigned || 0,
            closed:         d.closed || 0,
            open:           d.open || 0,
            inProgress:     0, // not tracked at report level
            completionRate: d.completionRate || 0,
            avgResolutionHours: d.avgResolutionHours || null,
            staffName:      d.staffName,
            designation:    d.designation,
            isOnLeave:      d.isOnLeave,
          });
        }
      } else {
        // ADMIN: fetch all reports
        const [staffRes, monthRes, yearRes] = await Promise.all([
          reportsAPI.staff(),
          reportsAPI.monthly(selectedYear),
          reportsAPI.yearly(),
        ]);
        if (staffRes.data.success) {
          const list = staffRes.data.data || [];
          setStaffData(list);
          if (staffRes.data.starStaff) setStarStaff(staffRes.data.starStaff);
          if (list.length > 0) setSelectedStaffId(list[0].staffId?.toString());
        }
        if (monthRes.data.success) setMonthlyData(monthRes.data.data);
        if (yearRes.data.success)  setYearlyData(yearRes.data.data || []);
      }

      // personalStats for STAFF is already set above from staffMe()
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports');
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

  // ─── Derived values ───
  const selectedStaff = selectedStaffId
    ? staffData.find(s => s.staffId?.toString() === selectedStaffId)
    : null;

  // ─── Drill-down: fetch complaints for a time range ───
  const [drillVisible, setDrillVisible]       = useState(false);
  const [drillTitle, setDrillTitle]           = useState('');
  const [drillComplaints, setDrillComplaints] = useState([]);
  const [drillLoading, setDrillLoading]       = useState(false);

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

  // ─── Swipe-to-switch-tab PanResponder (ADMIN tabs: staff → monthly → yearly) ───
  const ADMIN_TABS = ['staff', 'monthly', 'yearly'];
  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx, vx }) => {
        if (Math.abs(dx) < 60 && Math.abs(vx) < 0.4) return;
        setActiveTab(prev => {
          const idx = ADMIN_TABS.indexOf(prev);
          return dx < 0
            ? ADMIN_TABS[Math.min(idx + 1, ADMIN_TABS.length - 1)]
            : ADMIN_TABS[Math.max(idx - 1, 0)];
        });
      },
    })
  ).current;

  // ─── Loading screen ───
  if (loading) {
    return (
      <ScreenLayout showBack showProfile={false} showDecor>
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACTIVE} />
          <Text style={s.loadingText}>Loading reports…</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={t('reportAnalysis')} showBack showProfile={true} showDecor>
      <View style={{ flex: 1 }} {...swipePan.panHandlers}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        {/* <View style={s.header}>
          <Text style={s.headerSub}>
            {role === 'STAFF' ? 'Your performance & asset analytics' : 'System-wide analytics'}
          </Text>
        </View> */}

        {/* ── Pill Tabs — ADMIN only ── */}
        {role === 'ADMIN' && (
          <View style={s.tabCard}>
            {[
              { id: 'staff',   label: 'Staff',   icon: 'people-outline'      },
              { id: 'monthly', label: 'Monthly', icon: 'calendar-outline'    },
              { id: 'yearly',  label: 'Yearly',  icon: 'stats-chart-outline' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabPill, activeTab === tab.id && s.tabPillActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={activeTab === tab.id ? '#FFF' : TEXT_MUT}
                  style={{ marginRight: 4 }}
                />
                <Text style={[s.tabPillText, activeTab === tab.id && s.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ════════════ STAFF: personal report (no tabs) ════════════ */}
        {role === 'STAFF' && (
          personalStats
            ? <StaffPersonalReport stats={personalStats} />
            : <EmptyState message="No report data available" />
        )}

        {/* ════════════════════════════════ ADMIN TABS ═════════════════════════════ */}
        {role === 'ADMIN' && activeTab === 'staff' && (
          <View>
            {starStaff && <StarOfMonthCard staff={starStaff} />}

            {staffData.length > 0 && (
              <TouchableOpacity style={s.selectorBtn} onPress={() => setShowPicker(true)}>
                <View style={s.selectorLeft}>
                  <View style={s.selectorAvatar}>
                    <Text style={s.selectorAvatarText}>
                      {selectedStaff?.staffName?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={s.selectorLabel}>Viewing staff</Text>
                    <Text style={s.selectorValue}>{selectedStaff?.staffName ?? '—'}</Text>
                  </View>
                </View>
                <View style={s.selectorRight}>
                  <Text style={s.selectorCount}>{staffData.length} staff</Text>
                  <Ionicons name="chevron-down" size={16} color={TEXT_MUT} />
                </View>
              </TouchableOpacity>
            )}

            {staffData.length === 0 ? (
              <EmptyState message="No staff data available" />
            ) : selectedStaff ? (
              <StaffDetailCard staff={selectedStaff} isMe={false} />
            ) : (
              <EmptyState message="Select a staff member" />
            )}
          </View>
        )}

        {/* ════════════════════════════════ MONTHLY TAB ════════════════════════════ */}
        {activeTab === 'monthly' && (
          <View>
            {/* Year navigator */}
            <View style={s.yearNav}>
              <TouchableOpacity
                style={s.yearNavBtn}
                onPress={() => setSelectedYear(y => y - 1)}
              >
                <Ionicons name="chevron-back" size={20} color={ACTIVE} />
              </TouchableOpacity>
              <Text style={s.yearNavText}>{selectedYear}</Text>
              <TouchableOpacity
                style={s.yearNavBtn}
                onPress={() => setSelectedYear(y => y + 1)}
                disabled={selectedYear >= new Date().getFullYear()}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={selectedYear >= new Date().getFullYear() ? TEXT_MUT : ACTIVE}
                />
              </TouchableOpacity>
            </View>

            {monthLoading ? (
              <View style={s.center}>
                <ActivityIndicator color={ACTIVE} />
              </View>
            ) : monthlyData ? (
              <MonthlySection monthlyData={monthlyData} openDrill={openDrill} />
            ) : (
              <EmptyState message="No monthly data" />
            )}
          </View>
        )}

        {/* ════════════════════════════════ YEARLY TAB ═════════════════════════════ */}
        {activeTab === 'yearly' && (
          <View>
            {yearlyData.length === 0 ? (
              <EmptyState message="No yearly data available" />
            ) : (
              yearlyData.map((yr, idx) => (
                <YearlyCard key={idx} yr={yr} openDrill={openDrill} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════════ Staff Picker Modal ════════ */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Staff Member</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close-circle" size={26} color={TEXT_MUT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {staffData.map(staff => {
                const isSelected = selectedStaffId === staff.staffId?.toString();
                return (
                  <TouchableOpacity
                    key={staff.staffId}
                    style={[s.pickerRow, isSelected && s.pickerRowActive]}
                    onPress={() => { setSelectedStaffId(staff.staffId?.toString()); setShowPicker(false); }}
                  >
                    <View style={[s.pickerAvatar, { backgroundColor: ACTIVE + '20' }]}>
                      <Text style={s.pickerAvatarText}>
                        {staff.staffName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.pickerInfo}>
                      <Text style={[s.pickerName, isSelected && { color: ACTIVE }]}>{staff.staffName}</Text>
                      <Text style={s.pickerSub}>
                        {staff.designation || 'Staff'} • {staff.isOnLeave ? '🔴 On Leave' : '🟢 Available'}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={ACTIVE} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Drill-down modal ── */}
      <Modal visible={drillVisible} animationType="slide" transparent onRequestClose={() => setDrillVisible(false)}>
        <View style={s.drillOverlay}>
          <View style={s.drillSheet}>
            <View style={s.drillHeader}>
              <Text style={s.drillTitle}>{drillTitle}</Text>
              <TouchableOpacity onPress={() => setDrillVisible(false)} style={s.drillClose}>
                <Ionicons name="close" size={20} color={TEXT_SEC} />
              </TouchableOpacity>
            </View>
            {drillLoading ? (
              <ActivityIndicator color={ACTIVE} style={{ marginTop: 32 }} />
            ) : drillComplaints.length === 0 ? (
              <View style={s.drillEmptyWrap}>
                <Ionicons name="clipboard-outline" size={40} color={TEXT_MUT} />
                <Text style={s.drillEmptyText}>No complaints in this period</Text>
              </View>
            ) : (
              <>
                <Text style={s.drillCount}>{drillComplaints.length} complaint{drillComplaints.length !== 1 ? 's' : ''}</Text>
                <FlatList
                  data={drillComplaints}
                  keyExtractor={item => (item.id || item._id)?.toString()}
                  renderItem={({ item }) => {
                    const sc = { OPEN: '#FF6B6B', ASSIGNED: '#FFA726', IN_PROGRESS: ACTIVE, FINISHING: '#AB47BC', RESOLVED: '#66BB6A', CLOSED: '#4CAF50' };
                    const color = sc[item.status] || TEXT_MUT;
                    return (
                      <View style={s.drillItem}>
                        <View style={s.drillItemLeft}>
                          <Text style={s.drillItemType}>{item.asset_type}</Text>
                          <Text style={s.drillItemDesc} numberOfLines={2}>{item.description}</Text>
                          <Text style={s.drillItemMeta}>{item.station}{item.location ? ` · ${item.location}` : ''}</Text>
                        </View>
                        <View style={[s.drillItemBadge, { backgroundColor: color + '22' }]}>
                          <Text style={[s.drillItemStatus, { color }]}>{item.status?.replace('_', ' ')}</Text>
                        </View>
                      </View>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </ScreenLayout>
  );
}

// MONTHLY SECTION (dynamic asset types)
function MonthlySection({ monthlyData, openDrill }) {
  const months   = monthlyData.months || [];
  const allTypes = monthlyData.assetTypes || [];
  const total    = monthlyData.total || 0;
  const year     = monthlyData.year;

  // Sum each type across all months for the summary chips
  const typeTotals = {};
  allTypes.forEach(type => {
    typeTotals[type] = months.reduce((sum, m) => sum + (m.byType?.[type] || 0), 0);
  });
  const nonZeroTypes = allTypes.filter(type => (typeTotals[type] || 0) > 0);

  // Descending: latest month first
  const activeMonths = months.filter(m => m.total > 0).slice().reverse();

  return (
    <View>
      {/* ── Trend Line Chart ── */}
      <View style={s.chartCard}>
        <Text style={s.chartCardTitle}>Complaint Trend {year}</Text>
        <TrendLineChart months={months} />
      </View>

      {/* ── Summary Cards ── */}
      <View style={s.summaryGrid}>
        <SummaryCard label="Total" value={total} color="#3B82F6" icon="layers-outline" wide />
        {nonZeroTypes.map((type, idx) => (
          <SummaryCard key={type} label={typeLabel(type)} value={typeTotals[type] || 0}
            color={typeColor(type, idx)} icon="construct-outline" />
        ))}
      </View>

      {activeMonths.length === 0 ? (
        <EmptyState message={`No complaints in ${year}`} />
      ) : (
        <View>
          <Text style={s.sectionTitle}>Monthly Breakdown</Text>
          {activeMonths.map((month) => (
            <TouchableOpacity
              key={month.month}
              style={s.monthCard}
              activeOpacity={openDrill ? 0.75 : 1}
              onPress={() => {
                if (!openDrill) return;
                const mo      = month.month;
                const nextMo  = mo === 12 ? 1 : mo + 1;
                const nextYr  = mo === 12 ? year + 1 : year;
                const fromStr = `${year}-${String(mo).padStart(2,'0')}-01T00:00:00.000Z`;
                const toDate  = new Date(`${nextYr}-${String(nextMo).padStart(2,'0')}-01T00:00:00.000Z`);
                toDate.setMilliseconds(toDate.getMilliseconds() - 1);
                openDrill(`${month.monthName} ${year}`, fromStr, toDate.toISOString());
              }}
            >
              <View style={s.monthCardHeader}>
                <Text style={s.monthName}>{month.monthName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={s.monthTotalBadge}>
                    <Text style={s.monthTotalText}>{month.total} total</Text>
                  </View>
                  {openDrill && <Ionicons name="list-outline" size={13} color={TEXT_MUT} />}
                </View>
              </View>
              <View style={s.barsWrap}>
                {allTypes.map((type, idx) => (
                  <BarRow key={type} label={typeLabel(type)} count={month.byType?.[type] || 0}
                    monthTotal={month.total} color={typeColor(type, idx)} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// STAFF DETAIL CARD (selected staff)
function StaffDetailCard({ staff, isMe }) {
  const rate = staff.completionRate || 0;

  return (
    <View style={[s.detailCard, isMe && s.detailCardHighlight]}>
      {/* Identity */}
      <View style={s.detailTop}>
        <View style={s.detailAvatar}>
          <Text style={s.detailAvatarText}>{staff.staffName?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.detailInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.detailName}>{staff.staffName}</Text>
            {isMe && <View style={s.youBadge}><Text style={s.youBadgeText}>You</Text></View>}
          </View>
          <Text style={s.detailEmail}>{staff.staffEmail}</Text>
          <Text style={s.detailMeta}>
            {staff.designation || 'Staff'} • {staff.isOnLeave ? '🔴 On Leave' : '🟢 Available'}
          </Text>
        </View>
      </View>

      {/* Donut + Stats side by side */}
      <View style={s.detailChartRow}>
        <CompletionDonut rate={rate} />
        <View style={s.detailStatsCol}>
          <StatBox label="Assigned"  value={staff.totalAssigned} color="#3B82F6" />
          <StatBox label="Completed" value={staff.closed}        color="#10B981" />
          <StatBox label="Pending"   value={staff.open}          color="#F59E0B" />
        </View>
      </View>

      {staff.avgResolutionHours != null && (
        <View style={s.metricLine}>
          <Text style={s.metricKey}>Avg Resolution Time</Text>
          <Text style={[s.metricVal, { color: '#3B82F6' }]}>{staff.avgResolutionHours}h</Text>
        </View>
      )}
    </View>
  );
}


// STAR OF THE MONTH CARD
// ════════════════════════════════════════
// STAFF PERSONAL REPORT (shown to STAFF role)
// Line-graph style showing their stats
// ════════════════════════════════════════
function StaffPersonalReport({ stats }) {
  const chartW = width - 56;
  const chartH = 180;
  const padTop = 16, padBottom = 30, padLeft = 44, padRight = 44;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  // Data points: Assigned, Closed, Pending — treat as a bar/spike chart
  const points = [
    { label: 'Assigned', value: stats.total,  color: '#3B82F6' },
    { label: 'Closed',   value: stats.closed, color: '#10B981' },
    { label: 'Pending',  value: stats.open,   color: '#F59E0B' },
  ];
  const maxVal = Math.max(...points.map(p => p.value), 1);
  const spacing = innerW / (points.length - 1);

  const pts = points.map((p, i) => ({
    ...p,
    x: padLeft + i * spacing,
    y: padTop + (1 - p.value / maxVal) * innerH,
  }));

  const linePoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Gradient area under the line
  const areaD =
    `M ${pts[0].x.toFixed(1)},${(padTop + innerH).toFixed(1)} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

  const rateColor = stats.completionRate >= 80 ? '#10B981'
    : stats.completionRate >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <View>
      {/* Identity row */}
      <View style={s.spIdentity}>
        <View style={s.spAvatar}>
          <Text style={s.spAvatarText}>{stats.staffName?.charAt(0).toUpperCase() ?? 'S'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.spName}>{stats.staffName}</Text>
          <Text style={s.spDesig}>
            {stats.designation || 'Staff'} • {stats.isOnLeave ? '🔴 On Leave' : '🟢 Available'}
          </Text>
        </View>
      </View>

      {/* Stat chips row */}
      <View style={s.spChips}>
        {points.map(p => (
          <View key={p.label} style={[s.spChip, { borderColor: p.color + '50' }]}>
            <Text style={[s.spChipVal, { color: p.color }]}>{p.value}</Text>
            <Text style={s.spChipLabel}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* Line chart card */}
      <View style={s.spChartCard}>
        <Text style={s.spChartTitle}>Job Statistics</Text>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <LinearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={ACTIVE} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={ACTIVE} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((f, i) => {
            const y = padTop + (1 - f) * innerH;
            return (
              <React.Fragment key={i}>
                <Line x1={padLeft} y1={y} x2={padLeft + innerW} y2={y}
                  stroke="#EEF4F7" strokeWidth="1" />
                <SvgText x={padLeft - 4} y={y + 3} fontSize="9" fill={TEXT_MUT} textAnchor="end">
                  {Math.round(f * maxVal)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Vertical dotted drop lines */}
          {pts.map((p, i) => (
            <Line key={i} x1={p.x} y1={p.y} x2={p.x} y2={padTop + innerH}
              stroke={p.color} strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.5" />
          ))}

          {/* Area fill */}
          <Path d={areaD} fill="url(#spGrad)" />

          {/* Line */}
          <Polyline points={linePoints} fill="none" stroke={ACTIVE}
            strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots with value labels */}
          {pts.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="5" fill={p.color} stroke="white" strokeWidth="2" />
              <SvgText x={p.x} y={p.y - 10} fontSize="11" fontWeight="bold"
                fill={p.color} textAnchor="middle">{p.value}</SvgText>
              <SvgText x={p.x} y={padTop + innerH + 16} fontSize="10"
                fill={TEXT_SEC} textAnchor="middle">{p.label}</SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>

      {/* Completion donut + resolution */}
      <View style={s.spBottomRow}>
        <View style={s.spDonutCard}>
          <CompletionDonut rate={stats.completionRate} size={110} />
        </View>
        <View style={s.spResCard}>
          <Text style={s.spResTitle}>Avg Resolution</Text>
          {stats.avgResolutionHours != null ? (
            <>
              <Text style={[s.spResVal, { color: '#3B82F6' }]}>{stats.avgResolutionHours}h</Text>
              <Text style={s.spResSub}>from assignment{'\n'}to closure</Text>
            </>
          ) : (
            <Text style={s.spResEmpty}>No closed jobs yet</Text>
          )}
          <View style={[s.spRateRow]}>
            <View style={[s.spRateDot, { backgroundColor: rateColor }]} />
            <Text style={[s.spRateLabel, { color: rateColor }]}>{stats.completionRate}% done</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StarOfMonthCard({ staff }) {
  const rate = staff.completionRate || 0;
  const rateColor = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <View style={s.starCard}>
      <View style={s.starHeader}>
        <View style={s.starBadge}>
          <Text style={s.starEmoji}>⭐</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.starTitle}>Star of the Month</Text>
          <Text style={s.starSub}>Top performer this month</Text>
        </View>
      </View>
      <View style={s.starBody}>
        <View style={s.starAvatar}>
          <Text style={s.starAvatarText}>{staff.staffName?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.starName}>{staff.staffName}</Text>
          <Text style={s.starDesig}>{staff.designation || 'Staff'}</Text>
          <View style={s.starMetrics}>
            <View style={s.starChip}>
              <Text style={[s.starChipText, { color: '#10B981' }]}>✓ {staff.closed} closed</Text>
            </View>
            <View style={[s.starChip, { backgroundColor: '#EEF6FB' }]}>
              <Text style={[s.starChipText, { color: rateColor }]}>{rate}% rate</Text>
            </View>
            {staff.avgResolutionHours != null && (
              <View style={[s.starChip, { backgroundColor: '#F0F4FF' }]}>
                <Text style={[s.starChipText, { color: '#6366F1' }]}>⚡ {staff.avgResolutionHours}h avg</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// YEARLY CARD  (sticky Y-axis + horizontally scrollable bars)
function YearlyCard({ yr, openDrill }) {
  const allTypes    = Object.keys(yr.byType || {});
  const nonZeroTypes = allTypes.filter(type => (yr.byType?.[type] || 0) > 0);

  const barW     = 38;
  const barGap   = 12;
  const groupGap = 24;
  const padTop   = 10;
  const padBottom = 26;
  const chartH   = 170;
  const innerH   = chartH - padTop - padBottom;

  // Fixed Y-axis column width
  const yAxisW   = 36;
  // Scrollable bar area
  const totalBars = 1 + nonZeroTypes.length;
  const scrollW  = totalBars * barW + (totalBars - 1) * barGap + groupGap + 16;

  const maxVal   = Math.max(...nonZeroTypes.map(t => yr.byType?.[t] || 0), yr.total || 1, 1);
  // Nice round Y-axis ticks
  const niceMax  = Math.ceil(maxVal / 5) * 5 || 5;
  const ticks    = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y:     padTop + innerH * (1 - f),
    label: Math.round(f * niceMax),
  }));

  const barH = (val) => Math.max((val / niceMax) * innerH, val > 0 ? 3 : 0);
  const barY = (val) => padTop + innerH - barH(val);

  const allBarX  = 8;
  const typeBarXs = nonZeroTypes.map((_, i) =>
    8 + barW + groupGap + i * (barW + barGap)
  );

  return (
    <View style={s.yearCard}>
      <TouchableOpacity
        style={s.yearCardHeader}
        activeOpacity={openDrill ? 0.7 : 1}
        onPress={() => {
          if (!openDrill) return;
          const toDate = new Date(`${yr.year + 1}-01-01T00:00:00.000Z`);
          toDate.setMilliseconds(toDate.getMilliseconds() - 1);
          openDrill(`${yr.year} complaints`, `${yr.year}-01-01T00:00:00.000Z`, toDate.toISOString());
        }}
      >
        <Text style={s.yearCardYear}>{yr.year}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={s.yearTotalBadge}>
            <Text style={s.yearTotalText}>{yr.total} total</Text>
          </View>
          {openDrill && <Ionicons name="list-outline" size={13} color={TEXT_MUT} />}
        </View>
      </TouchableOpacity>

      {nonZeroTypes.length > 0 ? (
        <>
          {/* Chart: fixed Y-axis + scrollable bars side by side */}
          <View style={{ flexDirection: 'row' }}>

            {/* ── Pinned Y-axis ── */}
            <Svg width={yAxisW} height={chartH}>
              {ticks.map((t, i) => (
                <React.Fragment key={i}>
                  {/* tick line */}
                  <Line x1={yAxisW - 4} y1={t.y} x2={yAxisW} y2={t.y}
                    stroke="#D0DDE6" strokeWidth="1" />
                  <SvgText x={yAxisW - 7} y={t.y + 4}
                    fontSize="9" fill={TEXT_MUT} textAnchor="end">
                    {t.label}
                  </SvgText>
                </React.Fragment>
              ))}
              {/* Y-axis line */}
              <Line x1={yAxisW - 1} y1={padTop} x2={yAxisW - 1} y2={padTop + innerH}
                stroke="#D0DDE6" strokeWidth="1" />
            </Svg>

            {/* ── Scrollable bars ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}>
              <Svg width={scrollW} height={chartH}>
                <Defs>
                  <LinearGradient id={`tG${yr.year}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={ACTIVE} stopOpacity="1" />
                    <Stop offset="100%" stopColor={ACTIVE} stopOpacity="0.4" />
                  </LinearGradient>
                  {nonZeroTypes.map((type, idx) => (
                    <LinearGradient key={type} id={`g${yr.year}${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={typeColor(type, idx)} stopOpacity="1" />
                      <Stop offset="100%" stopColor={typeColor(type, idx)} stopOpacity="0.4" />
                    </LinearGradient>
                  ))}
                </Defs>

                {/* Horizontal grid lines */}
                {ticks.map((t, i) => (
                  <Line key={i} x1={0} y1={t.y} x2={scrollW} y2={t.y}
                    stroke="#EEF4F7" strokeWidth="1" strokeDasharray="4,3" />
                ))}

                {/* Baseline */}
                <Line x1={0} y1={padTop + innerH} x2={scrollW} y2={padTop + innerH}
                  stroke="#D0DDE6" strokeWidth="1.5" />

                {/* Total bar */}
                <Rect x={allBarX} y={barY(yr.total)} width={barW} height={barH(yr.total)}
                  rx={5} fill={`url(#tG${yr.year})`} />
                <SvgText x={allBarX + barW / 2} y={barY(yr.total) - 5}
                  fontSize="10" fontWeight="bold" fill={ACTIVE} textAnchor="middle">
                  {yr.total}
                </SvgText>
                <SvgText x={allBarX + barW / 2} y={padTop + innerH + 17}
                  fontSize="9" fill={TEXT_SEC} textAnchor="middle">All</SvgText>

                {/* Type bars */}
                {nonZeroTypes.map((type, idx) => {
                  const val   = yr.byType?.[type] || 0;
                  const x     = typeBarXs[idx];
                  const color = typeColor(type, idx);
                  const lbl   = typeLabel(type).split(' ')[0];
                  return (
                    <React.Fragment key={type}>
                      <Rect x={x} y={barY(val)} width={barW} height={barH(val)}
                        rx={5} fill={`url(#g${yr.year}${idx})`} />
                      {val > 0 && (
                        <SvgText x={x + barW / 2} y={barY(val) - 5}
                          fontSize="10" fontWeight="bold" fill={color} textAnchor="middle">
                          {val}
                        </SvgText>
                      )}
                      <SvgText x={x + barW / 2} y={padTop + innerH + 17}
                        fontSize="9" fill={TEXT_SEC} textAnchor="middle">
                        {lbl}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </ScrollView>
          </View>

          {/* Legend */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.yearLegend}>
            <View style={s.yearLegendItem}>
              <View style={[s.yearLegendDot, { backgroundColor: ACTIVE }]} />
              <Text style={s.yearLegendLabel}>Total</Text>
            </View>
            {nonZeroTypes.map((type, idx) => (
              <View key={type} style={s.yearLegendItem}>
                <View style={[s.yearLegendDot, { backgroundColor: typeColor(type, idx) }]} />
                <Text style={s.yearLegendLabel}>{typeLabel(type)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text style={s.yearNoData}>No asset breakdown available</Text>
      )}
    </View>
  );
}

// SVG CHART: Trend Line — sticky Y-axis + scrollable plot
function TrendLineChart({ months }) {
  const colW     = 44;          // px per month column
  const padTop   = 14;
  const padBottom = 26;
  const chartH   = 155;
  const innerH   = chartH - padTop - padBottom;
  const yAxisW   = 36;          // fixed left column for Y labels

  const innerW   = (months.length - 1) * colW;
  const scrollW  = innerW + colW; // extra half-col padding on each end

  const maxVal   = Math.max(...months.map(m => m.total), 1);
  const niceMax  = Math.ceil(maxVal / 5) * 5 || 5;
  const ticks    = [0, 0.5, 1].map(f => ({
    y:     padTop + (1 - f) * innerH,
    label: Math.round(f * niceMax),
  }));

  // Points centred in each column
  const pts = months.map((m, i) => ({
    x: colW / 2 + i * colW,
    y: padTop + (1 - m.total / niceMax) * innerH,
    total: m.total,
    name: m.monthName?.slice(0, 3),
  }));

  const linePoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD =
    `M ${pts[0].x.toFixed(1)},${(padTop + innerH).toFixed(1)} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

  return (
    <View style={{ flexDirection: 'row' }}>

      {/* ── Pinned Y-axis ── */}
      <Svg width={yAxisW} height={chartH}>
        {ticks.map((t, i) => (
          <React.Fragment key={i}>
            <Line x1={yAxisW - 4} y1={t.y} x2={yAxisW} y2={t.y}
              stroke="#D0DDE6" strokeWidth="1" />
            <SvgText x={yAxisW - 7} y={t.y + 4}
              fontSize="9" fill={TEXT_MUT} textAnchor="end">
              {t.label}
            </SvgText>
          </React.Fragment>
        ))}
        {/* Axis line */}
        <Line x1={yAxisW - 1} y1={padTop} x2={yAxisW - 1} y2={padTop + innerH}
          stroke="#D0DDE6" strokeWidth="1" />
        {/* Baseline tick */}
        <Line x1={yAxisW - 4} y1={padTop + innerH} x2={yAxisW} y2={padTop + innerH}
          stroke="#D0DDE6" strokeWidth="1" />
      </Svg>

      {/* ── Scrollable chart ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <Svg width={scrollW} height={chartH}>
          <Defs>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={ACTIVE} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={ACTIVE} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* Grid lines aligned with Y-axis ticks */}
          {ticks.map((t, i) => (
            <Line key={i} x1={0} y1={t.y} x2={scrollW} y2={t.y}
              stroke="#EEF4F7" strokeWidth="1" />
          ))}
          {/* Baseline */}
          <Line x1={0} y1={padTop + innerH} x2={scrollW} y2={padTop + innerH}
            stroke="#D0DDE6" strokeWidth="1.5" />

          {/* Gradient area */}
          <Path d={areaD} fill="url(#lineGrad)" />

          {/* Trend line */}
          <Polyline points={linePoints} fill="none" stroke={ACTIVE}
            strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots + values */}
          {pts.map((p, i) => p.total > 0 && (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="4.5"
                fill={ACTIVE} stroke="white" strokeWidth="2" />
              <SvgText x={p.x} y={p.y - 9} fontSize="9" fontWeight="bold"
                fill={ACTIVE} textAnchor="middle">{p.total}</SvgText>
            </React.Fragment>
          ))}

          {/* X labels — every month */}
          {pts.map((p, i) => (
            <SvgText key={i} x={p.x} y={chartH - 5} fontSize="9"
              fill={TEXT_MUT} textAnchor="middle">{p.name}</SvgText>
          ))}
        </Svg>
      </ScrollView>
    </View>
  );
}

// SVG CHART: Completion Donut
function CompletionDonut({ rate, size = 100 }) {
  const r  = (size - 20) / 2;
  const cx = size  / 2;
  const cy = size / 2;
  const toRad = deg => (deg * Math.PI) / 180;
  const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

  const startAngle = -90;
  const endAngle   = startAngle + (rate / 100) * 360;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = rate > 50 ? 1 : 0;

  const arcPath = rate >= 99.9
    ? `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 1 1 ${(x1 - 0.01).toFixed(2)} ${y1.toFixed(2)}`
    : `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF4F7" strokeWidth="5" />
      {rate > 0 && (
        <Path d={arcPath} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      )}
      {/* Use string concat — JSX {rate}% creates two text nodes with a space in between */}
      <SvgText x={cx} y={cy + 7} fontSize="18" fontWeight="bold"
        fill={TEXT_PRI} textAnchor="middle">{rate + '%'}</SvgText>
      <SvgText x={cx} y={cy + 20} fontSize="9"
        fill={TEXT_MUT} textAnchor="middle">complete</SvgText>
    </Svg>
  );
}

// SMALL COMPONENTS
function QuickStat({ label, value, color }) {
  return (
    <View style={[s.quickStat, { borderColor: color + '40' }]}>
      <Text style={[s.quickStatVal, { color }]}>{value}</Text>
      <Text style={s.quickStatLabel}>{label}</Text>
    </View>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={[s.statBox, { backgroundColor: color + '15' }]}>
      <Text style={[s.statBoxVal, { color }]}>{value}</Text>
      <Text style={s.statBoxLabel}>{label}</Text>
    </View>
  );
}

function SummaryCard({ label, value, color, icon, wide }) {
  return (
    <View style={[s.summaryCard, wide && s.summaryCardWide]}>
      <View style={[s.summaryIconBg, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={[s.summaryVal, { color }]}>{value}</Text>
      <Text style={s.summaryLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function BarRow({ label, count, monthTotal, color }) {
  const pct = monthTotal > 0 ? (count / monthTotal) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barCount}>{count}</Text>
    </View>
  );
}

function EmptyState({ message }) {
  return (
    <View style={s.empty}>
      <Ionicons name="analytics-outline" size={44} color={TEXT_MUT} />
      <Text style={s.emptyText}>{message}</Text>
    </View>
  );
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════
const s = StyleSheet.create({
  scroll: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: TEXT_MUT, marginTop: 12 },

  // Header
  //header: { paddingVertical: 18 },
  //headerTitle: { fontSize: 23, fontWeight: '800', color: TEXT_PRI, marginBottom: 4 },
  headerSub: { fontSize: 13, color: TEXT_SEC, marginTop: -6 },

  // Pill tabs
  tabCard: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabPillActive: { backgroundColor: ACTIVE },
  tabPillText: { fontSize: 12, fontWeight: '600', color: TEXT_MUT },
  tabPillTextActive: { color: '#FFF' },

  // Staff selector button
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: ACTIVE + '50',
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectorAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ACTIVE + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  selectorAvatarText: { fontSize: 15, fontWeight: '800', color: ACTIVE },
  selectorRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectorCount: { fontSize: 12, color: TEXT_MUT },
  selectorLabel: { fontSize: 11, color: TEXT_MUT, marginBottom: 1 },
  selectorValue: { fontSize: 15, fontWeight: '700', color: TEXT_PRI },

  // My stats card
  myStatsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: ACTIVE,
  },
  myStatsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  myStatsTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRI, marginLeft: 8 },
  myStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  quickStatVal: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, color: TEXT_MUT, marginTop: 2 },
  progressBarWrap: {},
  progressBg: { height: 8, backgroundColor: '#E8F4FA', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: ACTIVE, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: TEXT_SEC, fontWeight: '600' },

  // Detail card
  detailCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  detailCardHighlight: { borderColor: ACTIVE, borderWidth: 2, backgroundColor: '#F8FCFF' },
  detailTop: { flexDirection: 'row', marginBottom: 16 },
  detailAvatar: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: ACTIVE + '25',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  detailAvatarText: { fontSize: 20, fontWeight: '800', color: ACTIVE },
  detailInfo: { flex: 1, justifyContent: 'center' },
  detailName: { fontSize: 16, fontWeight: '800', color: TEXT_PRI },
  detailEmail: { fontSize: 12, color: TEXT_MUT, marginTop: 2 },
  detailMeta: { fontSize: 12, color: TEXT_SEC, marginTop: 3, fontWeight: '500' },

  // donut + stats layout in detail card
  detailChartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  detailStatsCol: { flex: 1, gap: 8 },

  detailStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  statBox: {
    flex: 0.31,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  statBoxVal: { fontSize: 18, fontWeight: '800' },
  statBoxLabel: { fontSize: 10, color: TEXT_MUT, marginTop: 2 },

  metricLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F7',
    marginTop: 4,
  },
  metricKey: { fontSize: 13, color: TEXT_MUT },
  metricVal: { fontSize: 14, fontWeight: '700' },

  // Chart card (monthly trend)
  chartCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  chartCardTitle: { fontSize: 13, fontWeight: '700', color: TEXT_SEC, marginBottom: 10 },

  youBadge: { marginLeft: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  youBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981' },

  // Row card (all-staff list)
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  rowCardHighlight: { borderColor: ACTIVE + '80', backgroundColor: '#F8FCFF' },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: ACTIVE + '20',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  rowAvatarText: { fontSize: 16, fontWeight: '800', color: ACTIVE },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: '700', color: TEXT_PRI },
  rowSub: { fontSize: 11, color: TEXT_SEC, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', marginRight: 6 },
  rowRateVal: { fontSize: 15, fontWeight: '800', color: TEXT_PRI },
  rowRateLabel: { fontSize: 10, color: TEXT_MUT },

  // Section title
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRI, marginBottom: 10, marginTop: 4 },

  // Summary cards (monthly) — compact pill style
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  summaryCardWide: { paddingHorizontal: 12 },
  summaryIconBg: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  summaryVal: { fontSize: 13, fontWeight: '800', color: TEXT_PRI },
  summaryLabel: { fontSize: 12, color: TEXT_MUT },

  // Year navigator
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  yearNavBtn: { padding: 10 },
  yearNavText: { fontSize: 18, fontWeight: '800', color: TEXT_PRI, marginHorizontal: 20 },

  // Month card
  monthCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  monthCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthName: { fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  monthTotalBadge: { backgroundColor: ACTIVE + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  monthTotalText: { fontSize: 12, fontWeight: '700', color: ACTIVE },
  barsWrap: {},
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 90, fontSize: 11, color: TEXT_SEC },
  barTrack: { flex: 1, height: 7, backgroundColor: '#F0F4F7', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 24, fontSize: 12, fontWeight: '700', color: TEXT_PRI, textAlign: 'right' },

  // Yearly card
  yearCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: ACTIVE,
  },
  yearCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  yearCardYear: { fontSize: 20, fontWeight: '800', color: TEXT_PRI },
  yearTotalBadge: { backgroundColor: ACTIVE + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  yearTotalText: { fontSize: 14, fontWeight: '700', color: ACTIVE },
  yearTypes: { gap: 8 },
  yearTypeItem: { flexDirection: 'row', alignItems: 'center' },
  yearTypeDot: { width: 10, height: 10, borderRadius: 3, marginRight: 8 },
  yearTypeLabel: { flex: 1, fontSize: 13, color: TEXT_SEC },
  yearTypeVal: { fontSize: 15, fontWeight: '700', color: TEXT_PRI },
  yearNoData: { fontSize: 13, color: TEXT_MUT, fontStyle: 'italic' },
  yearLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  yearLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yearLegendDot: { width: 8, height: 8, borderRadius: 2 },
  yearLegendLabel: { fontSize: 11, color: TEXT_SEC },

  // Star of Month
  starCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FFD93D',
  },
  starHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  starBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFD93D30',
    alignItems: 'center', justifyContent: 'center',
  },
  starEmoji: { fontSize: 18 },
  starTitle: { fontSize: 14, fontWeight: '800', color: '#92600A' },
  starSub: { fontSize: 11, color: '#B07D2A' },
  starBody: { flexDirection: 'row', alignItems: 'center' },
  starAvatar: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#FFD93D50',
    alignItems: 'center', justifyContent: 'center',
  },
  starAvatarText: { fontSize: 20, fontWeight: '800', color: '#92600A' },
  starName: { fontSize: 15, fontWeight: '800', color: TEXT_PRI },
  starDesig: { fontSize: 11, color: TEXT_SEC, marginBottom: 6 },
  starMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  starChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  starChipText: { fontSize: 11, fontWeight: '700' },

  // Staff Personal Report
  spIdentity: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: ACTIVE,
  },
  spAvatar: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: ACTIVE + '25', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  spAvatarText: { fontSize: 20, fontWeight: '800', color: ACTIVE },
  spName: { fontSize: 16, fontWeight: '800', color: TEXT_PRI },
  spDesig: { fontSize: 12, color: TEXT_SEC, marginTop: 2 },

  spChips: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  spChip: {
    flex: 0.31, alignItems: 'center', paddingVertical: 12,
    backgroundColor: CARD_BG, borderRadius: 12, borderWidth: 1.5,
  },
  spChipVal: { fontSize: 22, fontWeight: '800' },
  spChipLabel: { fontSize: 11, color: TEXT_MUT, marginTop: 2 },

  spChartCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 12,
  },
  spChartTitle: { fontSize: 13, fontWeight: '700', color: TEXT_SEC, marginBottom: 8 },

  spBottomRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  spDonutCard: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  spResCard: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 14,
    justifyContent: 'center',
  },
  spResTitle: { fontSize: 12, color: TEXT_MUT, marginBottom: 6 },
  spResVal: { fontSize: 28, fontWeight: '800' },
  spResSub: { fontSize: 11, color: TEXT_MUT, lineHeight: 16, marginTop: 2 },
  spResEmpty: { fontSize: 13, color: TEXT_MUT, fontStyle: 'italic' },
  spRateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  spRateDot: { width: 8, height: 8, borderRadius: 4 },
  spRateLabel: { fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F7',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRI },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerRowActive: { backgroundColor: ACTIVE + '12' },
  pickerAvatar: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  pickerAvatarText: { fontSize: 16, fontWeight: '800', color: ACTIVE },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  pickerSub: { fontSize: 12, color: TEXT_MUT, marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 14, color: TEXT_MUT, marginTop: 12 },

  // ── Drill-down modal ──────────────────────────────────────
  drillOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  drillSheet: {
    backgroundColor: '#F5F9FC', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, maxHeight: '80%',
  },
  drillHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  drillTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRI, flex: 1 },
  drillClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF4F8', alignItems: 'center', justifyContent: 'center' },
  drillCount: { fontSize: 12, color: TEXT_MUT, marginBottom: 12 },
  drillItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#A0BDD0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  drillItemLeft: { flex: 1, marginRight: 10 },
  drillItemType: { fontSize: 11, fontWeight: '700', color: ACTIVE, marginBottom: 2 },
  drillItemDesc: { fontSize: 13, color: TEXT_PRI, marginBottom: 3 },
  drillItemMeta: { fontSize: 11, color: TEXT_MUT },
  drillItemBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  drillItemStatus: { fontSize: 10, fontWeight: '700' },
  drillEmptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  drillEmptyText: { color: TEXT_MUT, fontSize: 14 },
});
