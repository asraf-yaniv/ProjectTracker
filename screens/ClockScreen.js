import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, FlatList, ScrollView, ActivityIndicator
} from 'react-native';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function ClockScreen() {
  const { profile } = useAuth();
  const isWorker = profile?.role === 'worker';

  // Selection state
  const [projects, setProjects] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Clock state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchProjects(), checkExistingClockIn()]);
      setInitializing(false);
    };
    initialize();
  }, []);

  // Check if the user already has an active clock event from a previous session
  const checkExistingClockIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('clock_events')
      .select('id, project_id, building_id, task_assignment_id')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .maybeSingle(); // Use maybeSingle to avoid error when no row exists

    if (data) {
      setIsClockedIn(true);
      setCurrentEventId(data.id);
    }
  };

  // Fetch all active projects
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, has_buildings')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
  };

  // Fetch buildings for the selected project
  const fetchBuildings = async (projectId) => {
    const { data, error } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching buildings:', error.message);
    } else {
      setBuildings(data);
    }
  };

  // Fetch tasks — workers see their assignments, others see all tasks
  const fetchTasks = async (projectId, buildingId = null) => {
    if (isWorker) {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('id, tasks(id, name, estimated_hours, quantity)')
        .eq('project_id', projectId)
        .eq('user_id', profile.id);

      if (error) {
        console.error('Error fetching assigned tasks:', error.message);
      } else {
        setTasks(data.map(a => ({
          id: a.id,
          name: a.tasks?.name,
          estimated_hours: a.tasks?.estimated_hours,
          isAssignment: true,
        })));
      }
    } else {
      let query = supabase
        .from('tasks')
        .select('id, name, estimated_hours')
        .eq('project_id', projectId);

      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tasks:', error.message);
      } else {
        setTasks(data);
      }
    }
  };

  // Reset building and task selection when project changes
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedBuilding(null);
    setSelectedTask(null);
    setBuildings([]);
    setTasks([]);

    if (project.has_buildings) {
      fetchBuildings(project.id);
    } else {
      fetchTasks(project.id);
    }
  };

  // Reset task selection when building changes
  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setSelectedTask(null);
    fetchTasks(selectedProject.id, building.id);
  };

  // Clock in — saves event to database
  const handleClockIn = async () => {
    if (!selectedTask) {
      Alert.alert('Error', 'Please select a task first.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('clock_events')
      .insert({
        user_id: user.id,
        project_id: selectedProject.id,
        building_id: selectedBuilding?.id || null,
        task_assignment_id: selectedTask.isAssignment ? selectedTask.id : null,
        clock_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsClockedIn(true);
      setCurrentEventId(data.id);
      Alert.alert('Success', `Clocked in to ${selectedProject.name}`);
    }

    setLoading(false);
  };

  // Clock out — updates existing event with clock_out time
  const handleClockOut = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('clock_events')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', currentEventId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsClockedIn(false);
      setCurrentEventId(null);
      setSelectedProject(null);
      setSelectedBuilding(null);
      setSelectedTask(null);
      setTasks([]);
      setBuildings([]);
      Alert.alert('Success', 'Clocked out successfully.');
    }

    setLoading(false);
  };

  // Sign out the current user
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Reusable horizontal chip selection list
  const renderSelectionList = (data, selected, onSelect, label) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selected?.id === item.id && styles.chipSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.chipText, selected?.id === item.id && styles.chipTextSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.chipList}
      />
    </>
  );

  // Show spinner while initializing
  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Clock In / Out</Text>

      {/* Selection section — hidden when clocked in */}
      {!isClockedIn && (
        <>
          {renderSelectionList(projects, selectedProject, handleSelectProject, 'Select Project:')}

          {selectedProject?.has_buildings && buildings.length > 0 &&
            renderSelectionList(buildings, selectedBuilding, handleSelectBuilding, 'Select Building:')}

          {tasks.length > 0 &&
            renderSelectionList(tasks, selectedTask, (item) => setSelectedTask(item), 'Select Task:')}
        </>
      )}

      {/* Active session summary */}
      {isClockedIn && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Currently Working On:</Text>
          {selectedProject
            ? <>
                <Text style={styles.summaryText}>Project: {selectedProject.name}</Text>
                {selectedBuilding && <Text style={styles.summaryText}>Building: {selectedBuilding.name}</Text>}
                {selectedTask && <Text style={styles.summaryText}>Task: {selectedTask.name}</Text>}
              </>
            : <Text style={styles.summaryText}>Session active — restored from previous login.</Text>
          }
        </View>
      )}

      {/* Clock In / Out button */}
      <TouchableOpacity
        style={[styles.button, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
        onPress={isClockedIn ? handleClockOut : handleClockIn}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
        }
      </TouchableOpacity>

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
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  chipList: {
    marginBottom: 16,
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
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  summaryText: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
  },
  button: {
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clockInButton: {
    backgroundColor: '#16a34a',
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
});