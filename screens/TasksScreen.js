import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal
} from 'react-native';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function TasksScreen() {
    const [activeClockAssignmentId, setActiveClockAssignmentId] = useState(null);
  const { profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal state for reporting completed quantity
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [completedQty, setCompletedQty] = useState('');

  const isWorker = profile?.role === 'worker';

  useEffect(() => {
  fetchProjects();
  checkActiveClockEvent();
}, []);
// Check if worker has an active clock event and which assignment it's for
const checkActiveClockEvent = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('clock_events')
    .select('task_assignment_id')
    .eq('user_id', user.id)
    .is('clock_out', null)
    .single();

  if (data?.task_assignment_id) {
    setActiveClockAssignmentId(data.task_assignment_id);
  }
};
  // Fetch projects
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

  // Fetch tasks — workers see only their assignments, others see all tasks
  const fetchTasks = async (projectId) => {
    setLoading(true);

    if (isWorker) {
      // Fetch only this worker's assignments for this project
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          id,
          status,
          completed_quantity,
          tasks (id, name, estimated_hours, quantity)
        `)
        .eq('project_id', projectId)
        .eq('user_id', profile.id);

      if (error) {
        console.error('Error fetching assignments:', error.message);
      } else {
        setAssignments(data);
      }
    } else {
      // Managers and leaders see all tasks
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, estimated_hours, quantity, building_id')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching tasks:', error.message);
      } else {
        setTasks(data);
      }
    }

    setLoading(false);
  };

  // Called when a project filter is selected
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setAssignments([]);
    setTasks([]);
    fetchTasks(project.id);
  };

  // Opens the report modal for a specific assignment
  const handleOpenReport = (assignment) => {
    setSelectedAssignment(assignment);
    setCompletedQty(assignment.completed_quantity?.toString() || '');
    setModalVisible(true);
  };

  // Saves the reported completed quantity to the database
  const handleSubmitReport = async () => {
    if (!completedQty || isNaN(completedQty)) {
      Alert.alert('Error', 'Please enter a valid number.');
      return;
    }

    const { error } = await supabase
      .from('task_assignments')
      .update({
        completed_quantity: parseFloat(completedQty),
        status: 'in_progress',
      })
      .eq('id', selectedAssignment.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Progress reported successfully.');
      setModalVisible(false);
      fetchTasks(selectedProject.id);
    }
  };

  // Renders a worker's assigned task card
  const renderAssignment = ({ item }) => {
  // Check if this assignment has an active clock event
  const isActive = activeClockAssignmentId === item.id;

  return (
    <View style={styles.card}>
      <Text style={styles.taskName}>{item.tasks?.name}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Target Quantity:</Text>
        <Text style={styles.detailValue}>{item.tasks?.quantity}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Completed:</Text>
        <Text style={styles.detailValue}>{item.completed_quantity ?? 0}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <Text style={[styles.detailValue, styles.status]}>{item.status}</Text>
      </View>
      <TouchableOpacity
        style={[styles.reportButton, !isActive && styles.reportButtonDisabled]}
        onPress={() => isActive && handleOpenReport(item)}
        disabled={!isActive}
      >
        <Text style={styles.reportButtonText}>
          {isActive ? 'Report Progress' : 'Clock in to this task first'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

  // Renders a manager's task card
  const renderTask = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.taskName}>{item.name}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Estimated Hours:</Text>
        <Text style={styles.detailValue}>{item.estimated_hours}h</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Quantity:</Text>
        <Text style={styles.detailValue}>{item.quantity}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isWorker ? 'My Tasks' : 'Tasks'}</Text>

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

      {/* Worker assignments list */}
      {!loading && isWorker && (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignment}
          ListEmptyComponent={
            selectedProject
              ? <Text style={styles.empty}>No tasks assigned to you for this project.</Text>
              : <Text style={styles.empty}>Select a project to view your tasks.</Text>
          }
        />
      )}

      {/* Manager task list */}
      {!loading && !isWorker && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListEmptyComponent={
            selectedProject
              ? <Text style={styles.empty}>No tasks found for this project.</Text>
              : <Text style={styles.empty}>Select a project to view tasks.</Text>
          }
        />
      )}

      {/* Report Progress Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Progress</Text>
            <Text style={styles.modalSubtitle}>{selectedAssignment?.tasks?.name}</Text>
            <Text style={styles.modalLabel}>
              Target: {selectedAssignment?.tasks?.quantity} units
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Completed quantity"
              value={completedQty}
              onChangeText={setCompletedQty}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  status: {
    textTransform: 'uppercase',
    color: '#2563eb',
  },
  reportButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  reportButtonDisabled: {
  backgroundColor: '#9ca3af',
},
  reportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});