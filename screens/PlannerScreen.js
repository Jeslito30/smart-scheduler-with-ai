import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getRepeatingTasksInDateRange, updateTaskStatus, deleteTask } from '../services/Database';
import { useIsFocused } from '@react-navigation/native';
import EditScreen from './EditScreen';
import { Plus, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';

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
    const { colors } = useTheme();
    const [activeView, setActiveView] = useState('Schedule');
    const [currentDate, setCurrentDate] = useState(new Date());
    const db = useSQLiteContext();
    const [tasks, setTasks] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const isFocused = useIsFocused();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // --- Alert Config ---
    const [alertConfig, setAlertConfig] = useState({
      visible: false,
      title: '',
      message: '',
      type: 'info',
      buttons: []
    });

    const showAlert = (title, message, type = 'info', buttons = []) => {
      setAlertConfig({ visible: true, title, message, type, buttons });
    };

    const closeAlert = () => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
    };

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
    
    const handleEdit = (task) => {
        setSelectedTask(task);
        setIsEditModalVisible(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalVisible(false);
        setSelectedTask(null);
        fetchTasksAndSchedules();
    };

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

    const executeDeleteTask = async (taskId) => {
        try {
            // Handle repeating task IDs which are like "12-2023-10-25"
            const originalTaskId = typeof taskId === 'string' ? parseInt(taskId.split('-')[0], 10) : taskId;
            await deleteTask(db, originalTaskId);
            fetchTasksAndSchedules();
        } catch (error) {
            console.error("Failed to delete task:", error);
            showAlert('Error', 'Could not delete the task.', 'error');
        }
    };

    const handleDelete = (taskId) => {
        showAlert(
            'Delete Task',
            'Are you sure you want to delete this task? This action cannot be undone.',
            'info',
            [
                { text: 'Cancel', style: 'cancel', onPress: closeAlert },
                { 
                    text: 'Delete', 
                    onPress: () => {
                        closeAlert();
                        executeDeleteTask(taskId);
                    } 
                }
            ]
        );
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
            style={[styles.viewTab, { borderBottomColor: colors.accentOrange }]}
            onPress={() => setActiveView(viewName)}
        >
            {Icon && <Icon size={20} color={activeView === viewName ? colors.textPrimary : colors.textSecondary} />}
            <Text
                style={[
                    styles.viewTabText,
                    { color: colors.textSecondary },
                    activeView === viewName && [styles.viewTabTextActive, { color: colors.textPrimary }]
                ]}
            >
                {text}
            </Text>
            {/* The orange underline effect */}
            {activeView === viewName && <View style={[styles.tabUnderline, { backgroundColor: colors.accentOrange }]} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            {/* Header Section (Optimized for button visibility) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goToPreviousDay}>
                    <ChevronLeft size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>{currentDate.toDateString()}</Text>
                <TouchableOpacity onPress={goToNextDay}>
                    <ChevronRight size={28} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Schedule/Tasks Tabs */}
            <View style={styles.viewTabsContainer}>
                <ViewTab icon={CalendarCheck} text="Schedule" viewName="Schedule" />
                <ViewTab text="Tasks" viewName="Tasks" />
            </View>

            {/* Quick Stats/Indicators Card */}
            <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.progressRed }]}>{tasks.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Urgent Tasks</Text>
                </View>
                <View style={[styles.verticalSeparator, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.accentOrange }]}>{schedules.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Classes Today</Text>
                </View>
                <View style={[styles.verticalSeparator, { backgroundColor: colors.textSecondary }]} />
                {/* Dynamic Day Indicator */}
                <View style={styles.statItem}>
                    <Text style={[styles.dayText, { color: colors.greenAccent }]}>{getCurrentDayName(currentDate)}</Text>
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
                            return <TaskCard key={task.id.toString()} {...task} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />;
                        })
                    ) : (
                        <View style={styles.emptyTasks}>
                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No schedules to display.</Text>
                        </View>
                    )
                ) : (
                    tasks.length > 0 ? (
                        tasks.map(task => {
                            const time24 = convertTo24HourFormat(task.time);
                            const deadline = `${task.date}T${time24}:00`;
                            return <TaskCard key={task.id.toString()} {...task} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />;
                        })
                    ) : (
                        <View style={styles.emptyTasks}>
                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No tasks to display.</Text>
                        </View>
                    )
                )}

            </ScrollView>

            {/* Floating Action Button (FAB) for adding tasks */}
            <TouchableOpacity style={[styles.floatingActionButton, { backgroundColor: colors.accentOrange, shadowColor: colors.accentOrange }]} onPress={handleAddPress}>
                <Plus size={30} color={colors.card} />
            </TouchableOpacity>

            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                onRequestClose={handleCloseEditModal}
            >
                {selectedTask && (
                <EditScreen
                    task={selectedTask}
                    onClose={handleCloseEditModal}
                />
                )}
            </Modal>

            <CustomAlert 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={closeAlert}
            />

        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontSize: 25,
        fontWeight: 'bold',
    },
    // Polished Add Button Style
    floatingActionButton: {
      position: 'absolute',
      right: 25,
      bottom: 25,
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
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
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 5,
    },
    viewTabTextActive: {
        fontWeight: 'bold',
    },
    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: 2,
    },

    // --- Quick Stats Card Styles (Unchanged) ---
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        fontSize: 14,
    },
    verticalSeparator: {
        width: 1,
        height: '70%',
        opacity: 0.2,
    },
    dayText: {
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
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
});

export default PlannerScreen;