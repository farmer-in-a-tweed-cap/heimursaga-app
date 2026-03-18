import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { Avatar } from '@/components/ui/Avatar';
import { StatsBar } from '@/components/ui/StatsBar';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { payoutApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Sponsorship, SponsorshipTier, Balance, Payout } from '@/types/api';

const TABS = ['OVERVIEW', 'SPONSORS', 'TIERS', 'PAYOUTS', 'OUTGOING'];
const PRO_TABS = new Set(['OVERVIEW', 'SPONSORS', 'TIERS', 'PAYOUTS']);

export default function SponsorshipsScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();
  const isPro = !!user?.is_pro;
  const [activeTab, setActiveTab] = useState(0);
  const activeTabName = TABS[activeTab];
  const needsUpgrade = !isPro && PRO_TABS.has(activeTabName);

  const { data: receivedData } = useApi<{ data: Sponsorship[]; results: number }>(ready && isPro ? '/sponsorships' : null);
  const { data: givenData } = useApi<{ data: Sponsorship[]; results: number }>(ready && activeTabName === 'OUTGOING' ? '/sponsorships/given' : null);
  const { data: tiersData } = useApi<{ data: SponsorshipTier[]; results: number }>(ready && activeTabName === 'TIERS' ? '/sponsorship-tiers' : null);
  const { data: balance } = useApi<Balance>(ready && isPro ? '/balance' : null);
  const { data: payoutsData } = useApi<{ data: Payout[]; results: number }>(ready && activeTabName === 'PAYOUTS' ? '/payouts' : null);

  const received = receivedData?.data ?? [];
  const given = givenData?.data ?? [];
  const tiers = tiersData?.data ?? [];
  const payouts = payoutsData?.data ?? [];

  const [payoutLoading, setPayoutLoading] = useState(false);
  const handleRequestPayout = async () => {
    if (payoutLoading) return;
    setPayoutLoading(true);
    try {
      await payoutApi.requestPayout();
      Alert.alert('Payout requested', 'Your payout is being processed.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to request payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="SPONSORSHIPS" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  // Amounts from API are already in dollars (converted via integerToDecimal)
  const totalRevenue = received.reduce((s, r) => s + r.amount, 0);
  const monthlyRecurring = received
    .filter((r) => r.type === 'subscription' && r.status === 'active')
    .reduce((s, r) => s + r.amount, 0);

  function formatType(type: string): string {
    const t = type.toLowerCase();
    if (t === 'subscription') return 'Monthly';
    if (t === 'quick_sponsor') return 'Quick-sponsor';
    return 'One-time';
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="SPONSORSHIPS" />

      {/* Tabs — scrollable */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        <View style={styles.tabRow}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === i && styles.tabItemActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabLabel, { color: activeTab === i ? brandColors.copper : colors.textTertiary }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView>
        <View style={styles.content}>
          {/* Upgrade prompt for free users on Pro tabs */}
          {needsUpgrade && (
            <View style={styles.upgradeWrap}>
              <View style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: brandColors.copper }]}>
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>Explorer Pro</Text>
                <Text style={[styles.upgradeDesc, { color: colors.textSecondary }]}>
                  Upgrade to Explorer Pro to receive sponsorships, manage tiers, view analytics, and request payouts.
                </Text>
                <HButton variant="copper" onPress={() => router.push('/upgrade')}>
                  UPGRADE TO PRO
                </HButton>
              </View>
            </View>
          )}

          {/* OVERVIEW */}
          {!needsUpgrade && activeTabName === 'OVERVIEW' && (
            <>
              <StatsBar
                stats={[
                  { value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, label: 'REVENUE' },
                  { value: String(received.length), label: 'SPONSORS' },
                  { value: `$${monthlyRecurring.toFixed(0)}`, label: 'MRR' },
                ]}
              />

              {balance && (
                <>
                  <SectionDivider title="BALANCE" />
                  <View style={styles.pad}>
                    <HCard>
                      <View style={styles.balanceCard}>
                        <Text style={[styles.balanceAmount, { color: colors.text }]}>
                          {balance.available.symbol}{balance.available.amount.toFixed(2)}
                        </Text>
                        <Text style={[styles.balancePending, { color: colors.textTertiary }]}>
                          {balance.pending.symbol}{balance.pending.amount.toFixed(2)} pending
                        </Text>
                        <View style={styles.payoutBtn}>
                          <HButton variant="copper" small onPress={handleRequestPayout} disabled={payoutLoading}>{payoutLoading ? 'REQUESTING...' : 'REQUEST PAYOUT'}</HButton>
                        </View>
                      </View>
                    </HCard>
                  </View>
                </>
              )}

              <SectionDivider title="RECENT SPONSORS" />
              <View style={styles.pad}>
                {received.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>No sponsors yet</Text>
                ) : (
                  <HCard>
                    {received.slice(0, 5).map((s, i) => {
                      const sponsor = s.user;
                      return (
                        <View
                          key={s.id}
                          style={[styles.sponsorRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin }]}
                        >
                          <Avatar size={28} name={sponsor?.username ?? '?'} />
                          <View style={styles.sponsorInfo}>
                            <Text style={styles.sponsorName}>{sponsor?.username ?? 'Anonymous'}</Text>
                            <Text style={[styles.sponsorMeta, { color: colors.textTertiary }]}>
                              {formatType(s.type)}
                            </Text>
                          </View>
                          <Text style={[styles.sponsorAmount, { color: brandColors.green }]}>
                            ${s.amount.toFixed(0)}
                          </Text>
                        </View>
                      );
                    })}
                  </HCard>
                )}
              </View>
            </>
          )}

          {/* SPONSORS */}
          {!needsUpgrade && activeTabName === 'SPONSORS' && (
            <>
              <SearchBar placeholder="Search sponsors..." />
              <View style={styles.filterRow}>
                {['ALL', 'ONE-TIME', 'MONTHLY', 'ACTIVE'].map((f) => (
                  <TouchableOpacity key={f} style={[styles.filterChip, { borderColor: colors.border }]}>
                    <Text style={[styles.filterText, { color: colors.textTertiary }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {received.map((s) => {
                const sponsor = s.user;
                return (
                  <HCard key={s.id}>
                    <View style={styles.sponsorRow}>
                      <Avatar size={32} name={sponsor?.username ?? '?'} />
                      <View style={styles.sponsorInfo}>
                        <Text style={styles.sponsorName}>{sponsor?.username ?? 'Anonymous'}</Text>
                        <Text style={[styles.sponsorMeta, { color: colors.textTertiary }]}>
                          {s.tier?.title ?? formatType(s.type)} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                        </Text>
                        {s.message && (
                          <Text style={[styles.sponsorMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                            "{s.message}"
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.sponsorAmount, { color: brandColors.green }]}>
                        ${s.amount.toFixed(0)}
                      </Text>
                    </View>
                  </HCard>
                );
              })}
            </>
          )}

          {/* TIERS */}
          {!needsUpgrade && activeTabName === 'TIERS' && (
            <>
              {(['ONE_TIME', 'MONTHLY'] as const).map((tierType) => {
                const filtered = tiers.filter((t) => t.type === tierType);
                return (
                  <View key={tierType}>
                    <SectionDivider title={tierType === 'ONE_TIME' ? 'ONE-TIME TIERS' : 'MONTHLY TIERS'} />
                    <View style={styles.pad}>
                      {filtered.length === 0 ? (
                        <Text style={[styles.empty, { color: colors.textTertiary }]}>No tiers</Text>
                      ) : (
                        <HCard>
                          {filtered.map((tier, i) => (
                            <View
                              key={tier.id}
                              style={[
                                styles.tierRow,
                                i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                                tier.isAvailable === false && { opacity: 0.4 },
                              ]}
                            >
                              <View style={[styles.tierDot, { backgroundColor: tier.isAvailable !== false ? brandColors.green : colors.textTertiary }]} />
                              <View style={styles.tierInfo}>
                                <Text style={[styles.tierName, { color: colors.text }]}>{tier.description || `Tier ${tier.priority ?? ''}`}</Text>
                              </View>
                              <Text style={[styles.tierAmount, { color: tierType === 'MONTHLY' ? brandColors.blue : brandColors.copper }]}>
                                ${tier.price.toFixed(0)}{tierType === 'MONTHLY' ? '/mo' : ''}
                              </Text>
                            </View>
                          ))}
                        </HCard>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* PAYOUTS */}
          {!needsUpgrade && activeTabName === 'PAYOUTS' && (
            <>
              {balance && (
                <StatsBar
                  stats={[
                    { value: `${balance.available.symbol}${balance.available.amount.toFixed(0)}`, label: 'AVAILABLE' },
                    { value: `${balance.pending.symbol}${balance.pending.amount.toFixed(0)}`, label: 'PENDING' },
                  ]}
                />
              )}
              <View style={styles.payoutBtnRow}>
                <HButton variant="copper" small onPress={handleRequestPayout} disabled={payoutLoading}>{payoutLoading ? 'REQUESTING...' : 'REQUEST PAYOUT'}</HButton>
              </View>

              <SectionDivider title="PAYOUT HISTORY" />
              <View style={styles.pad}>
                {payouts.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>No payouts yet</Text>
                ) : (
                  <HCard>
                    {payouts.map((p, i) => (
                      <View
                        key={p.id}
                        style={[styles.payoutRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin }]}
                      >
                        <View style={styles.payoutInfo}>
                          <Text style={[styles.payoutAmount, { color: colors.text }]}>
                            {p.currency?.symbol ?? '$'}{p.amount.toFixed(2)}
                          </Text>
                          <Text style={[styles.payoutMeta, { color: colors.textTertiary }]}>
                            {p.created ? new Date(p.created).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        <Text style={[styles.payoutStatus, { color: p.status === 'completed' ? brandColors.green : brandColors.copper }]}>
                          {p.status.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </HCard>
                )}
              </View>
            </>
          )}

          {/* OUTGOING */}
          {activeTabName === 'OUTGOING' && (
            <>
              <SectionDivider title="ACTIVE SUBSCRIPTIONS" />
              <View style={styles.pad}>
                {given.filter((g) => g.type === 'subscription' && g.status === 'active').length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>No active subscriptions</Text>
                ) : (
                  given.filter((g) => g.type === 'subscription' && g.status === 'active').map((s) => (
                    <HCard key={s.id}>
                      <View style={styles.outgoingRow}>
                        <View style={styles.outgoingInfo}>
                          <Text style={[styles.outgoingName, { color: colors.text }]}>
                            {s.expedition?.title ?? 'Expedition'}
                          </Text>
                          <Text style={[styles.outgoingMeta, { color: colors.textTertiary }]}>
                            ${s.amount.toFixed(0)}/mo · Since {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        <HButton variant="copper" outline small onPress={() => {}}>MANAGE</HButton>
                      </View>
                    </HCard>
                  ))
                )}
              </View>

              <SectionDivider title="PAYMENT HISTORY" />
              <View style={styles.pad}>
                {given.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>No payments</Text>
                ) : (
                  <HCard>
                    {given.map((s, i) => (
                      <View
                        key={s.id}
                        style={[styles.payoutRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin }]}
                      >
                        <View style={styles.payoutInfo}>
                          <Text style={[styles.payoutAmount, { color: colors.text }]}>${s.amount.toFixed(0)}</Text>
                          <Text style={[styles.payoutMeta, { color: colors.textTertiary }]}>
                            {s.expedition?.title ?? 'Expedition'} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        <Text style={[styles.payoutStatus, { color: brandColors.copper }]}>
                          {formatType(s.type).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </HCard>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  tabScroll: { flexGrow: 0, minHeight: 46 },
  tabScrollContent: { flexGrow: 1, justifyContent: 'center' },
  tabRow: { flexDirection: 'row' },
  tabItem: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    marginBottom: 3,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: brandColors.copper },
  tabLabel: { fontFamily: mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  content: { padding: 16 },
  upgradeWrap: { paddingVertical: 24 },
  upgradeCard: { borderWidth: borders.thick, padding: 20, gap: 14 },
  upgradeTitle: { fontFamily: mono, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  upgradeDesc: { fontFamily: mono, fontSize: 12, lineHeight: 18 },
  pad: { paddingHorizontal: 0 },
  empty: { fontFamily: mono, fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 24 },
  balanceCard: { padding: 16, alignItems: 'center' },
  balanceAmount: { fontFamily: mono, fontSize: 28, fontWeight: '700' },
  balancePending: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginTop: 4 },
  payoutBtn: { marginTop: 12, width: '100%' },
  payoutBtnRow: { paddingVertical: 12 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 14 },
  sponsorInfo: { flex: 1 },
  sponsorName: { fontSize: 12, color: brandColors.copper, fontWeight: '600' },
  sponsorMeta: { fontFamily: mono, fontSize: 12, fontWeight: '600', marginTop: 2 },
  sponsorMessage: { fontSize: 12, fontStyle: 'italic', marginTop: 3 },
  sponsorAmount: { fontFamily: mono, fontSize: 14, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1 },
  filterText: { fontFamily: mono, fontSize: 11, fontWeight: '700' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 14 },
  tierDot: { width: 6, height: 6, flexShrink: 0 },
  tierInfo: { flex: 1 },
  tierName: { fontSize: 12, fontWeight: '600' },
  tierDesc: { fontSize: 12, marginTop: 1 },
  tierAmount: { fontFamily: mono, fontSize: 13, fontWeight: '700' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 14 },
  payoutInfo: { flex: 1 },
  payoutAmount: { fontFamily: mono, fontSize: 14, fontWeight: '700' },
  payoutMeta: { fontFamily: mono, fontSize: 10, fontWeight: '600', marginTop: 2 },
  payoutStatus: { fontFamily: mono, fontSize: 11, fontWeight: '700' },
  outgoingRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  outgoingInfo: { flex: 1 },
  outgoingName: { fontSize: 13, fontWeight: '600' },
  outgoingMeta: { fontFamily: mono, fontSize: 10, fontWeight: '600', marginTop: 2 },
  spacer: { height: 32 },
});
