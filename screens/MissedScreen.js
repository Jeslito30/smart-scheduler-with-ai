import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getMissedTasks, updateTaskStatus } from '../services/Database';
import { useIsFocused } from '@react-navigation/native';

// --- Color Constants ---
const LightColors = {
  background: '#F8F9FA', // Very light grey
  card: '#FFFFFF',
  textPrimary: '#212529', // Dark grey/black
  textSecondary: '#6C757D', // Grey
  accentOrange: '#FF9500',
  progressRed: '#FF4500',  // Used for the 'Missed' indicator
};

// --- Utility Function to convert 12-hour time to 24-hour time ---
const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');

  if (hours === '12') {
    hours = '00';
  }

  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours}:${minutes}`;
};

// --- Utility Function to get Current Date in YYYY-MM-DD format ---
const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num) => (num < 10 ? '0' + num : num);
  return `${year}-${pad(month)}-${pad(day)}`;
};

const MissedScreen = ({ user }) => {
    const db = useSQLiteContext();
    const [missedTasks, setMissedTasks] = useState([]);
    const isFocused = useIsFocused();
    const [activeFilter, setActiveFilter] = useState('Today');

    const fetchMissed = useCallback(async () => {
        if (user?.id) {
            try {
                const fetchedPotentialMissedTasks = await getMissedTasks(db, user.id);
                const now = new Date();
                const today = getCurrentDate();

                let trulyMissedTasks = fetchedPotentialMissedTasks.filter(task => {
                    // Task is of type 'Task' and status is 'pending' - already handled by SQL query
                    const time24 = convertTo24HourFormat(task.time);
                    const deadline = new Date(`${task.date}T${time24}:00`);
                    return deadline < now;
                });

                if (activeFilter === 'Today') {
                    trulyMissedTasks = trulyMissedTasks.filter(task => task.date === today);
                }
                setMissedTasks(trulyMissedTasks);
            } catch (error) {
                console.error("Failed to fetch missed tasks:", error);
            }
        }
    }, [db, user?.id, activeFilter]);

    useEffect(() => {
        if (isFocused) {
            fetchMissed();
        }
    }, [isFocused, fetchMissed]);

    const handleDone = async (taskId) => {
        try {
          await updateTaskStatus(db, taskId, 'done');
          fetchMissed(); // Refreshes the list to remove the completed task
        } catch (error) {
          console.error("Failed to update task status from MissedScreen:", error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.titleText}>Missed</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeFilter === 'Today' && styles.tabActive]}
                    onPress={() => setActiveFilter('Today')}>
                    <Text style={[styles.tabText, activeFilter === 'Today' && styles.tabTextActive]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeFilter === 'All' && styles.tabActive]}
                    onPress={() => setActiveFilter('All')}>
                    <Text style={[styles.tabText, activeFilter === 'All' && styles.tabTextActive]}>All</Text>
                </TouchableOpacity>
            </View>

            {/* Task List */}
            <FlatList
                data={missedTasks}
                renderItem={({ item }) => {
                    const time24 = convertTo24HourFormat(item.time);
                    const deadline = `${item.date}T${time24}:00`;
                    return <TaskCard {...item} deadline={deadline} onDone={handleDone} />;
                }}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.taskList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyTasks}>
                        <Text style={styles.emptyText}>No missed tasks.</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LightColors.background,
        paddingHorizontal: 15, // Apply horizontal padding to the whole screen
    },

    // --- Header Styles ---
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 10, // For space from the top edge of safe area
        marginBottom: 20,
    },
    titleText: {
        color: LightColors.textPrimary,
        fontSize: 25,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 15,
        paddingVertical: 5,
        gap: 20,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: LightColors.accentOrange,
    },
    tabText: {
        color: LightColors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
    tabTextActive: {
        color: LightColors.textPrimary,
        fontWeight: 'bold',
    },
    taskList: {
        flexGrow: 1, // Allows the container to grow to fill space
        paddingBottom: 0, // Add padding to the bottom to avoid being cut off by the tab navigator
    },
    emptyTasks: {
        paddingVertical: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: LightColors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
});

export default MissedScreen;