import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, ScrollView } from 'react-native';
import { supabase } from '../supabase';

export default function ClockScreen() {
  const [projects, setProjects] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

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

  // Fetch tasks for the selected project and optionally building
  const fetchTasks = async (projectId, buildingId = null) => {
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
  };

  // Called when worker selects a project
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

  // Called when worker selects a building
  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setSelectedTask(null);
    fetchTasks(selectedProject.id, building.id);
  };

  // Records clock in to the database
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

  // Records clock out time
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

  // Reusable selection list renderer
  const renderSelectionList = (data, selected, onSelect, label) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Clock In / Out</Text>

      {/* Only show selection when not clocked in */}
      {!isClockedIn && (
        <>
          {/* Project selection */}
          {renderSelectionList(projects, selectedProject, handleSelectProject, 'Select Project:')}

          {/* Building selection — only shown if project has buildings */}
          {selectedProject?.has_buildings && buildings.length > 0 &&
            renderSelectionList(buildings, selectedBuilding, handleSelectBuilding, 'Select Building:')}

          {/* Task selection */}
          {tasks.length > 0 &&
            renderSelectionList(tasks, selectedTask, setSelectedTask, 'Select Task:')}
        </>
      )}

      {/* Summary when clocked in */}
      {isClockedIn && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Currently Working On:</Text>
          <Text style={styles.summaryText}>Project: {selectedProject?.name}</Text>
          {selectedBuilding && <Text style={styles.summaryText}>Building: {selectedBuilding?.name}</Text>}
          <Text style={styles.summaryText}>Task: {selectedTask?.name}</Text>
        </View>
      )}

      {/* Clock In / Out button */}
      <TouchableOpacity
        style={[styles.button, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
        onPress={isClockedIn ? handleClockOut : handleClockIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Please wait...' : isClockedIn ? 'Clock Out' : 'Clock In'}
        </Text>
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
    marginTop: 8,
    marginBottom: 32,
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
});