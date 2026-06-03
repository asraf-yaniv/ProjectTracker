import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { supabase } from '../supabase';

export default function TasksScreen() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch all active projects for the filter bar
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
  };

  // Fetch tasks for the selected project
  const fetchTasks = async (projectId) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('id, name, estimated_hours, material_cost, quantity, building_id')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching tasks:', error.message);
    } else {
      setTasks(data);
    }

    setLoading(false);
  };

  // Called when a project filter is selected
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    fetchTasks(project.id);
  };

  // Renders a single task card
  const renderTask = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.taskName}>{item.name}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Estimated Hours:</Text>
        <Text style={styles.detailValue}>{item.estimated_hours}h</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Material Cost:</Text>
        <Text style={styles.detailValue}>₪{item.material_cost}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Quantity:</Text>
        <Text style={styles.detailValue}>{item.quantity}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>

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

      {/* Task list */}
      {!loading && selectedProject && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListEmptyComponent={<Text style={styles.empty}>No tasks found for this project.</Text>}
        />
      )}

      {/* Prompt to select a project */}
      {!selectedProject && (
        <View style={styles.centered}>
          <Text style={styles.prompt}>Select a project to view its tasks.</Text>
        </View>
      )}
    </View>
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
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prompt: {
    fontSize: 16,
    color: '#6b7280',
  },
  empty: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
});