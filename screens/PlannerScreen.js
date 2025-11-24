import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getRepeatingTasksInDateRange, updateTaskStatus } from '../services/Database';
import { useIsFocused } from '@react-navigation/native';
// Importing Lucide icons for the header/tabs
import { Plus, CalendarCheck, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';

// --- Constants ---
const LightColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#1F1F1F',
  textSecondary: '#6B7280',
  accentOrange: '#FF9500',
  progressRed: '#FF4500',
  greenAccent: '#4CAF50',
};

// --- Utility Function to get Current Day Name (e.g., MON, TUE) ---
const getCurrentDayName = (date) => {
    const options = { weekday: 'short' };
    const dayName = date.toLocaleDateString('en-US', options);
    return dayName.toUpperCase();
};

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const PlannerScreen = ({ navigation, user }) => {
    const [activeView, setActiveView] = useState('Schedule');
    const [currentDate, setCurrentDate] = useState(new Date());
    const db = useSQLiteContext();
    const [tasks, setTasks] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const isFocused = useIsFocused();

    const fetchTasksAndSchedules = useCallback(async () => {
        if (user?.id) {
            try {
                const dateString = formatDate(currentDate);
                
                // Fetch all tasks and schedules for the current date, including repeating ones
                const allTodayTasks = await getRepeatingTasksInDateRange(db, user.id, dateString, dateString);
                
                // Separate tasks and schedules
                const fetchedTasks = allTodayTasks.filter(t => t.type === 'Task');
                const fetchedSchedules = allTodayTasks.filter(t => t.type !== 'Task');

                setTasks(fetchedTasks);
                setSchedules(fetchedSchedules);
            } catch (error) {
                console.error("Failed to fetch tasks and schedules:", error);
            }
        }
    }, [db, user?.id, currentDate]);

    useEffect(() => {
        if (isFocused) {
            fetchTasksAndSchedules();
        }
    }, [isFocused, fetchTasksAndSchedules]);

    // Handler for Add button press
    const handleAddPress = () => {
        navigation?.navigate('Add', { user: user });
    }

    const handleDone = async (taskId) => {
        try {
          // The ID of a repeating task instance is a string, so we need to extract the original ID
          const originalTaskId = typeof taskId === 'string' ? parseInt(taskId.split('-')[0], 10) : taskId;
          await updateTaskStatus(db, originalTaskId, 'done');
          fetchTasksAndSchedules(); // Refreshes the list
        } catch (error) {
          console.error("Failed to update task status in PlannerScreen:", error);
        }
    };
    
    const goToPreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };


    // Helper component for the view selection tabs
    const ViewTab = ({ icon: Icon, text, viewName }) => (
        <TouchableOpacity
            style={styles.viewTab}
            onPress={() => setActiveView(viewName)}
        >
            {Icon && <Icon size={20} color={activeView === viewName ? LightColors.textPrimary : LightColors.textSecondary} />}
            <Text
                style={[
                    styles.viewTabText,
                    activeView === viewName && styles.viewTabTextActive
                ]}
            >
                {text}
            </Text>
            {/* The orange underline effect */}
            {activeView === viewName && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header Section (Optimized for button visibility) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goToPreviousDay}>
                    <ChevronLeft size={28} color={LightColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.titleText}>{currentDate.toDateString()}</Text>
                <TouchableOpacity onPress={goToNextDay}>
                    <ChevronRight size={28} color={LightColors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Schedule/Tasks Tabs */}
            <View style={styles.viewTabsContainer}>
                <ViewTab icon={CalendarCheck} text="Schedule" viewName="Schedule" />
                <ViewTab icon={CheckCircle} text="Tasks" viewName="Tasks" />
            </View>

            {/* Quick Stats/Indicators Card */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: LightColors.progressRed }]}>{tasks.length}</Text>
                    <Text style={styles.statLabel}>Urgent Tasks</Text>
                </View>
                <View style={styles.verticalSeparator} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: LightColors.accentOrange }]}>{schedules.length}</Text>
                    <Text style={styles.statLabel}>Classes Today</Text>
                </View>
                <View style={styles.verticalSeparator} />
                {/* Dynamic Day Indicator */}
                <View style={styles.statItem}>
                    <Text style={styles.dayText}>{getCurrentDayName(currentDate)}</Text>
                </View>
            </View>


            {/* Task List - Uses ScrollView for content scrolling */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Conditionally render content based on activeView */}
                {activeView === 'Schedule' ? (
                    schedules.length > 0 ? (
                        schedules.map(task => {
                            const time24 = convertTo24HourFormat(task.time);
                            const deadline = `${task.date}T${time24}:00`;
                            return <TaskCard key={task.id.toString()} {...task} deadline={deadline} onDone={handleDone} />;
                        })
                    ) : (
                        <View style={styles.emptyTasks}>
                            <Text style={styles.emptyText}>No schedules to display.</Text>
                        </View>
                    )
                ) : (
                    tasks.length > 0 ? (
                        tasks.map(task => {
                            const time24 = convertTo24HourFormat(task.time);
                            const deadline = `${task.date}T${time24}:00`;
                            return <TaskCard key={task.id.toString()} {...task} deadline={deadline} onDone={handleDone} />;
                        })
                    ) : (
                        <View style={styles.emptyTasks}>
                            <Text style={styles.emptyText}>No tasks to display.</Text>
                        </View>
                    )
                )}

            </ScrollView>

            {/* Floating Action Button (FAB) for adding tasks */}
            <TouchableOpacity style={styles.floatingActionButton} onPress={handleAddPress}>
                <Plus size={30} color={LightColors.card} />
            </TouchableOpacity>

        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LightColors.background,
        paddingHorizontal: 15,
    },
    scrollContent: {
        // paddingBottom: 20, // Removed to reduce space
    },

    // --- Header Styles ---
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 15,
        marginBottom: 10,
    },
    titleText: {
        color: LightColors.textPrimary,
        fontSize: 25,
        fontWeight: 'bold',
    },
    subtitleText: {
        color: LightColors.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    // Polished Add Button Style
    floatingActionButton: {
      position: 'absolute',
      right: 25,
      bottom: 25,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: LightColors.accentOrange,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: LightColors.accentOrange,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },

    // --- View Tabs Styles (Unchanged) ---
    viewTabsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 20,
    },
    viewTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginRight: 20,
        position: 'relative',
    },
    viewTabText: {
        color: LightColors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 5,
    },
    viewTabTextActive: {
        color: LightColors.textPrimary,
        fontWeight: 'bold',
    },
    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: LightColors.accentOrange,
        borderRadius: 2,
    },

    // --- Quick Stats Card Styles (Unchanged) ---
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: LightColors.card,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statLabel: {
        color: LightColors.textSecondary,
        fontSize: 14,
    },
    verticalSeparator: {
        width: 1,
        height: '70%',
        backgroundColor: LightColors.textSecondary,
        opacity: 0.2,
    },
    dayText: {
        color: LightColors.greenAccent,
        fontSize: 28,
        fontWeight: 'bold',
    },

    // --- Empty State Styles (Unchanged) ---
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
    emptyTextSecondary: {
        color: LightColors.textSecondary,
        fontSize: 14,
    }
});

export default PlannerScreen;