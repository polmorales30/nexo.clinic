import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Activity, Droplet, Utensils, CalendarDays, ChevronRight, Home, LineChart as ChartIcon, Calendar } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const LIME_GREEN = '#CCFF00';
const PINK = '#FF1493';
const DARK_BG = '#0A0A0A';
const CARD_BG = '#1A1A1A';
const TEXT_MUTED = '#888888';

export default class App extends React.Component {
  state = { activeTab: 'home' };

  renderHome = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>Alex ⚡️</Text>
        </View>
        <View style={styles.avatarPlaceholder} />
      </View>

      {/* Macros Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Target</Text>
        <View style={styles.macrosContainer}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>1,850</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>140g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
            <View style={[styles.progressBar, { width: '80%', backgroundColor: PINK }]} />
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>180g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
            <View style={[styles.progressBar, { width: '60%', backgroundColor: LIME_GREEN }]} />
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>60g</Text>
            <Text style={styles.macroLabel}>Fats</Text>
            <View style={[styles.progressBar, { width: '40%', backgroundColor: LIME_GREEN }]} />
          </View>
        </View>
      </View>

      {/* Next Meal */}
      <TouchableOpacity style={[styles.card, styles.nextMealCard]}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Utensils color={DARK_BG} size={20} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.nextMealLabel}>Next Meal • 14:00</Text>
              <Text style={styles.nextMealTitle}>Grilled Chicken Salad</Text>
            </View>
          </View>
          <ChevronRight color={LIME_GREEN} size={24} />
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => this.setState({ activeTab: 'metrics' })}>
          <Activity color={LIME_GREEN} size={24} />
          <Text style={styles.actionText}>Log Weight</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Droplet color="#4da6ff" size={24} />
          <Text style={styles.actionText}>Water</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => this.setState({ activeTab: 'visits' })}>
          <CalendarDays color={LIME_GREEN} size={24} />
          <Text style={styles.actionText}>Agenda</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  renderMetrics = () => {
    // Mock Data for Custom Charts
    const weightData = [82, 80, 78, 77.5, 76];
    const maxWeight = 85;
    const weightLabels = ["Jan", "Feb", "Mar", "Apr", "May"];

    const fatData = [22, 21, 19.5, 18.2, 17];
    const maxFat = 25;
    const fatLabels = ["Jan", "Feb", "Mar", "Apr", "May"];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Progress Metrics</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weight Trend (kg)</Text>
          <View style={styles.chartContainer}>
            {weightData.map((val, idx) => {
              const heightPct = (val / maxWeight) * 100;
              return (
                <View key={idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: LIME_GREEN }]} />
                  </View>
                  <Text style={styles.barLabel}>{weightLabels[idx]}</Text>
                  <Text style={styles.barValue}>{val}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Fat (%)</Text>
          <View style={styles.chartContainer}>
            {fatData.map((val, idx) => {
              const heightPct = (val / maxFat) * 100;
              return (
                <View key={idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: PINK }]} />
                  </View>
                  <Text style={styles.barLabel}>{fatLabels[idx]}</Text>
                  <Text style={styles.barValue}>{val}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  renderVisits = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Appointments</Text>

      <View style={styles.appointmentList}>
        <Text style={styles.sectionHeader}>Upcoming</Text>

        <TouchableOpacity style={[styles.card, styles.nextMealCard]}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: PINK }]}>
                <Calendar color={DARK_BG} size={20} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.nextMealLabel, { color: PINK }]}>Follow-up Check • Mon, 15 Oct</Text>
                <Text style={styles.nextMealTitle}>Dr. Sarah Jenkins</Text>
              </View>
            </View>
            <ChevronRight color={PINK} size={24} />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Past</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#333' }]}>
              <Calendar color={TEXT_MUTED} size={20} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.nextMealLabel, { color: TEXT_MUTED }]}>Initial Consult • Mon, 1 Oct</Text>
              <Text style={styles.nextMealTitle}>Dr. Sarah Jenkins</Text>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );

  render() {
    const { activeTab } = this.state;
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />

        <View style={{ flex: 1 }}>
          {activeTab === 'home' && this.renderHome()}
          {activeTab === 'metrics' && this.renderMetrics()}
          {activeTab === 'visits' && this.renderVisits()}
        </View>

        {/* Custom Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => this.setState({ activeTab: 'home' })}>
            <Home color={activeTab === 'home' ? LIME_GREEN : TEXT_MUTED} size={24} />
            <Text style={[styles.tabLabel, { color: activeTab === 'home' ? LIME_GREEN : TEXT_MUTED }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => this.setState({ activeTab: 'metrics' })}>
            <ChartIcon color={activeTab === 'metrics' ? LIME_GREEN : TEXT_MUTED} size={24} />
            <Text style={[styles.tabLabel, { color: activeTab === 'metrics' ? LIME_GREEN : TEXT_MUTED }]}>Metrics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => this.setState({ activeTab: 'visits' })}>
            <Calendar color={activeTab === 'visits' ? LIME_GREEN : TEXT_MUTED} size={24} />
            <Text style={[styles.tabLabel, { color: activeTab === 'visits' ? LIME_GREEN : TEXT_MUTED }]}>Visits</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 100, // padding for tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    color: TEXT_MUTED,
    fontSize: 16,
    fontFamily: 'System',
  },
  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: LIME_GREEN,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  macroItem: {
    alignItems: 'flex-start',
    flex: 1,
  },
  macroValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: '#333',
    width: '100%',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
    marginHorizontal: 16,
    alignSelf: 'center',
  },
  nextMealCard: {
    borderWidth: 1,
    borderColor: '#333',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIME_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextMealLabel: {
    color: LIME_GREEN,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextMealTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    width: '31%',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionHeader: {
    color: TEXT_MUTED,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    paddingTop: 16,
    paddingBottom: 32, // safe area padding approx
    borderTopWidth: 1,
    borderTopColor: '#333',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  barColumn: {
    alignItems: 'center',
    width: 40,
  },
  barTrack: {
    width: 20,
    height: 120,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  barLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    position: 'absolute',
    top: -20,
  }
});
