import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function ProjectsScreen() {
  // projects holds the list of projects fetched from the database
  const [projects, setProjects] = useState([]);
  // loading shows a spinner while data is being fetched
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetches all active projects from Supabase
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active');

    console.log('Data:', JSON.stringify(data));
    console.log('Error:', JSON.stringify(error));

    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
    setLoading(false);
  };

  // Renders a single project card in the list
  const renderProject = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.projectName}>{item.name}</Text>
      <Text style={styles.projectDetail}>Client: {item.client_name}</Text>
      <Text style={styles.projectDetail}>Location: {item.location}</Text>
      <Text style={styles.status}>{item.status}</Text>
    </View>
  );

  // Show a spinner while loading
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projects</Text>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        ListEmptyComponent={<Text style={styles.empty}>No projects found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
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
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  status: {
    marginTop: 8,
    fontSize: 12,
    color: '#16a34a',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});