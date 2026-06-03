import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView
} from 'react-native';
import { supabase } from '../supabase';

export default function DashboardScreen() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch all projects
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status');

    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
  };

  // Calculate project statistics from tasks and clock events
  const fetchProjectStats = async (projectId) => {
    setLoading(true);

    // Fetch all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, estimated_hours, material_cost, quantity')
      .eq('project_id', projectId);

    // Fetch all clock events for this project
    const { data: clockEvents, error: clockError } = await supabase
      .from('clock_events')
      .select('clock_in, clock_out')
      .eq('project_id', projectId)
      .not('clock_out', 'is', null); // Only completed clock events

    if (tasksError || clockError) {
      console.error('Error fetching stats');
      setLoading(false);
      return;
    }

    // Calculate total estimated hours from tasks
    const totalEstimatedHours = tasks.reduce((sum, task) => {
      return sum + (task.estimated_hours * task.quantity);
    }, 0);

    // Calculate total material cost from tasks
    const totalMaterialCost = tasks.reduce((sum, task) => {
      return sum + (task.material_cost * task.quantity);
    }, 0);

    // Calculate total actual hours from clock events
    const totalActualHours = clockEvents.reduce((sum, event) => {
      const clockIn = new Date(event.clock_in);
      const clockOut = new Date(event.clock_out);
      const hours = (clockOut - clockIn) / (1000 * 60 * 60); // Convert ms to hours
      return sum + hours;
    }, 0);

    // Calculate efficiency percentage
    const efficiency = totalActualHours > 0
  ? ((totalActualHours / totalEstimatedHours) * 100).toFixed(1)
  : null;

    setStats({
      totalTasks: tasks.length,
      totalEstimatedHours: totalEstimatedHours.toFixed(1),
      totalActualHours: totalActualHours.toFixed(1),
      totalMaterialCost: totalMaterialCost.toFixed(2),
      efficiency,
    });

    setLoading(false);
  };

  // Called when a project is selected
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setStats(null);
    fetchProjectStats(project.id);
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Project filter bar */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selectedProject?.id === item.id && styles.chipSelected]}
            onPress={() => handleSelectProject(item)}
          >
            <Text style={[styles.chipText, selectedProject?.id === item.id && styles.chipTextSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.chipList}
      />

      {/* Loading spinner */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}

      {/* Stats cards */}
      {!loading && stats && (
        <View>
          <Text style={styles.sectionTitle}>{selectedProject?.name} — Overview</Text>

          {/* Total Tasks */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Tasks</Text>
            <Text style={styles.cardValue}>{stats.totalTasks}</Text>
          </View>

          {/* Hours comparison */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Estimated Hours</Text>
            <Text style={styles.cardValue}>{stats.totalEstimatedHours}h</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Actual Hours Worked</Text>
            <Text style={styles.cardValue}>{stats.totalActualHours}h</Text>
          </View>

          {/* Efficiency */}
          <Text style={[
            styles.cardValue,
            stats.efficiency === null ? styles.neutral :
            parseFloat(stats.efficiency) <= 100 ? styles.good : styles.bad
            ]}>
             {stats.efficiency === null ? 'N/A' : `${stats.efficiency}%`}
            </Text>
            <Text style={styles.efficiencyNote}>
            {stats.efficiency === null
             ? 'No clock events recorded yet'
             : parseFloat(stats.efficiency) <= 100
             ? 'Under budget — good!'
              : 'Over budget — review required'}
            </Text>

          {/* Material Cost */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Material Cost</Text>
            <Text style={styles.cardValue}>₪{stats.totalMaterialCost}</Text>
          </View>
        </View>
      )}

      {/* Prompt to select project */}
      {!selectedProject && !loading && (
        <View style={styles.centered}>
          <Text style={styles.prompt}>Select a project to view its dashboard.</Text>
        </View>
      )}

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  chipList: {
    marginBottom: 16,
    flexGrow: 0,
  },
  chip: {
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#111827',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  efficiencyCard: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  efficiencyNote: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  good: {
    color: '#16a34a',
  },
  bad: {
    color: '#dc2626',
  },
  neutral: {
  color: '#6b7280',
},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  prompt: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});