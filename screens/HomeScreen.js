import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllTasks, getUpcomingTasks, updateTaskStatus, deleteTask } from '../services/Database'; 
import { useIsFocused } from '@react-navigation/native';
import { getScheduleRecommendation } from '../services/AiServices';
import { Bell, BellOff, Sparkles, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import EditScreen from './EditScreen';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num) => (num < 10 ? '0' + num : num);
  return `${year}-${pad(month)}-${pad(day)}`;
};

const getFormattedDate = () => {
  const date = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

const getDayName = () => {
  const date = new Date();
  const options = { weekday: 'long' };
  return date.toLocaleDateString('en-US', options);
};

const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}`;
};

const HomeScreen = ({ user, navigation }) => {
  const { colors, isNotificationsEnabled, toggleNotifications } = useTheme();
  const userName = user.name;
  const initial = userName.split(' ').map(n => n[0]).join('');
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const profilePicture = user?.profile_picture;

  const [activeTab, setActiveTab] = useState('Upcoming');
  const [activeFilter, setActiveFilter] = useState('All');
  const [tasks, setTasks] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // --- AI Modal States ---
  const [isAiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // --- Toast Notification State ---
  const [toastMessage, setToastMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
      setToastMessage(message);
      Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
      }).start();

      setTimeout(() => {
          Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
          }).start(() => setToastMessage(null));
      }, 2000);
  };

  const fetchTasks = useCallback(async () => {
    if (user?.id) {
      try {
        const today = getCurrentDate();
        let fetchedTasks;
        let typeFilterClause = "";
        if (activeFilter === 'Task') {
          typeFilterClause = " AND type = 'Task'";
        } else if (activeFilter === 'Schedule') {
          typeFilterClause = " AND type != 'Task'";
        }

        switch (activeTab) {
          case 'All':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ?${typeFilterClause}`, [user.id]);
            break;
          case 'Today':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND date = ?${typeFilterClause}`, [user.id, today]);
            break;
          case 'Upcoming':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND date > ? AND status != 'done'${typeFilterClause}`, [user.id, today]);
            break;
          case 'Completed':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND status = 'done'${typeFilterClause}`, [user.id]);
            break;
          default:
            fetchedTasks = [];
        }
        setTasks(fetchedTasks);
        if(activeTab === 'All') {
          setAllTasks(fetchedTasks);
        } else {
          const all = await getAllTasks(db, user.id);
          setAllTasks(all);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    }
  }, [db, user?.id, activeTab, activeFilter]);

  useEffect(() => {
    if (isFocused) {
      fetchTasks();
    }
  }, [isFocused, fetchTasks]);

  const handleDone = async (taskId) => {
    try {
      await updateTaskStatus(db, taskId, 'done');
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const executeDeleteTask = async (taskId) => {
    try {
        await deleteTask(db, taskId);
        fetchTasks();
        showToast("Task deleted successfully");
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

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const dayName = getDayName();
  const formattedDate = getFormattedDate();

  const handleNotificationPress = () => {
    toggleNotifications();
    const newState = !isNotificationsEnabled ? 'On' : 'Off';
    showToast(`Notifications turned ${newState}`);
  };

  // --- AI Logic ---
  const handleAiButtonPress = () => {
    setAiModalVisible(true);
    setAiPrompt('');
    setAiResult(null);
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; 
      const allUpcomingTasks = await getUpcomingTasks(db, user.id, today);
      const contextTasks = allUpcomingTasks.slice(0, 50);
      const recommendation = await getScheduleRecommendation(contextTasks, aiPrompt);
      setAiResult(recommendation);
    } catch (error) {
      console.error("AI generation failed:", error);
      Alert.alert("AI Error", "Could not generate a schedule. Please check your connection.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddRecommendation = () => {
    setAiModalVisible(false);
    navigation.navigate('Add', { 
        user: user,
        prefilledData: aiResult 
    });
  };

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
  };

  const completedTasksCount = allTasks.filter(task => task.status === 'done').length;
  const donePercentage = allTasks.length > 0 ? Math.round((completedTasksCount / allTasks.length) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarContainer}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.accentOrange }]}>
                  <Text style={[styles.avatarText, { color: colors.card }]}>{initial}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Hey,</Text>
              <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userName}</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                    styles.headerButton, 
                    isNotificationsEnabled 
                        ? { backgroundColor: colors.accentOrange, shadowColor: colors.accentOrange } 
                        : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.textSecondary }
                ]} 
                onPress={handleNotificationPress}
              >
                  {isNotificationsEnabled ? (
                      <Bell size={24} color={colors.card} />
                  ) : (
                      <BellOff size={24} color={colors.textSecondary} />
                  )}
              </TouchableOpacity>
          </View>
        </View>

        {/* Today's Report Card */}
        <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
          <View style={styles.reportHeader}>
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>Today's Report</Text>
          </View>
          <View style={styles.reportBody}>
            <View>
              <Text style={[styles.reportDateLarge, { color: colors.textPrimary }]}>{dayName}</Text>
              <Text style={[styles.reportDateSmall, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{allTasks.length}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
                    <Text style={[styles.statValue, { color: colors.accentOrange }]}>{donePercentage}%</Text>
                </View>
            </View>
          </View>
          <View style={styles.reportFooter}>
              <Text style={[styles.quote, { color: colors.textSecondary }]}>
                "Focus on being productive instead of busy."
                <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}> - Tim Ferriss</Text>
              </Text>
          </View>
        </View>

        {/* List Header with Filter Toggle */}
        <View style={styles.listHeaderContainer}>
          <Text style={[styles.listHeaderTitle, { color: colors.textPrimary }]}>
            {activeFilter === 'Schedule'
              ? 'My Schedules'
              : activeFilter === 'All'
              ? 'Tasks and Schedules'
              : 'My Tasks'}
          </Text>
          <TouchableOpacity onPress={toggleFilterVisibility} style={styles.filterIcon}>
            <Ionicons name="options-outline" size={24} color={isFilterVisible ? colors.accentOrange : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Toggleable Filter Tabs for Task/Schedule */}
        {isFilterVisible && (
          <View style={[styles.filterTabsContainer, { borderBottomColor: colors.tabInactive }]}>
            {['All', 'Task', 'Schedule'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTabButton, activeFilter === filter && [styles.filterTabActive, { borderBottomColor: colors.accentOrange }]]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterTabText, { color: colors.textSecondary }, activeFilter === filter && [styles.filterTabTextActive, { color: colors.textPrimary }]]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Navigation Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.background }]}>
          {['All', 'Today', 'Upcoming', 'Completed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && [styles.tabActive, { borderBottomColor: colors.accentOrange }]]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && [styles.tabTextActive, { color: colors.textPrimary }]]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task List */}
        <FlatList
          data={tasks}
          renderItem={({ item }) => {
            const time24 = convertTo24HourFormat(item.time);
            const deadline = `${item.date}T${time24}:00`;
            return <TaskCard {...item} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />;
          }}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.taskList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyTasks}>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No tasks to display.</Text>
            </View>
          )}
        />
      </View>

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

      {/* --- AI Modal --- */}
      <Modal
        visible={isAiModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAiModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
            <View style={[styles.aiModalContainer, { backgroundColor: colors.card }]}>
                <View style={styles.aiModalHeader}>
                    <View style={styles.aiTitleRow}>
                        <Sparkles size={24} color={colors.accentOrange} style={{marginRight: 8}}/>
                        <Text style={[styles.aiModalTitle, { color: colors.textPrimary }]}>Smart AI Assistant</Text>
                    </View>
                    <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                        <X size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.aiInstruction, { color: colors.textSecondary }]}>What do you want to do?</Text>

                <View style={[styles.aiInputContainer, { backgroundColor: colors.inputBackground }]}>
                    <TextInput 
                        style={[styles.aiTextInput, { color: colors.textPrimary }]}
                        placeholder="e.g., I need to study for Math exam..."
                        placeholderTextColor={colors.textSecondary}
                        value={aiPrompt}
                        onChangeText={setAiPrompt}
                        multiline
                    />
                </View>

                {isAiLoading ? (
                    <View style={styles.aiLoadingContainer}>
                        <ActivityIndicator size="large" color={colors.accentOrange} />
                        <Text style={[styles.aiLoadingText, { color: colors.textSecondary }]}>Analyzing your schedule...</Text>
                    </View>
                ) : aiResult ? (
                    <View style={styles.aiResultContainer}>
                        <Text style={[styles.aiResultLabel, { color: colors.textPrimary }]}>AI Recommendation:</Text>
                        <View style={[styles.recommendationCard, { backgroundColor: colors.accentOrange + '20', borderLeftColor: colors.accentOrange }]}>
                            <Text style={[styles.recommendationTitle, { color: colors.textPrimary }]}>{aiResult.title}</Text>
                            <Text style={[styles.recommendationDetail, { color: colors.accentOrange }]}>{aiResult.date} at {aiResult.time}</Text>
                            <Text style={[styles.recommendationReason, { color: colors.textSecondary }]}>{aiResult.reason}</Text>
                        </View>
                        <TouchableOpacity style={[styles.addToScheduleButton, { backgroundColor: colors.greenAccent }]} onPress={handleAddRecommendation}>
                            <Text style={styles.addToScheduleText}>Add to Schedule</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.askAiButton, { backgroundColor: colors.accentOrange }]} onPress={handleAiSubmit}>
                        <Text style={styles.askAiButtonText}>Ask AI</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Floating Action Button */}
      <TouchableOpacity style={[styles.aiButton, { backgroundColor: colors.accentOrange, shadowColor: colors.accentOrange }]} onPress={handleAiButtonPress}>
        <Sparkles size={30} color={colors.card} />
      </TouchableOpacity>

      {/* --- Toast Notification --- */}
      {toastMessage && (
          <Animated.View style={[
              styles.toastContainer, 
              { opacity: fadeAnim, backgroundColor: colors.card, borderColor: colors.accentOrange }
          ]}>
              <Text style={[styles.toastText, { color: colors.accentOrange }]}>{toastMessage}</Text>
          </Animated.View>
      )}

      {/* Custom Alert */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  greetingText: {
    fontSize: 14,
    lineHeight: 16,
  },
  userNameText: {
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },

  reportCard: {
    borderRadius: 15,
    padding: 18,
    marginTop: 20,
    marginBottom: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 5,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportDateSmall: {
    fontSize: 16,
  },
  reportDateLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 120,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportFooter: {},
  quote: {
    fontSize: 14,
    marginTop: 15,
    lineHeight: 18,
  },
  quoteAuthor: {
      fontSize: 14,
  },

  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterIcon: {
    padding: 5,
  },

  filterTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingBottom: 5,
    borderBottomWidth: 2,
  },
  filterTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  filterTabActive: {
    borderBottomWidth: 3,
  },
  filterTabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterTabTextActive: {
    fontWeight: 'bold',
  },


  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  tabActive: {
      borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
      fontWeight: 'bold',
  },
  taskList: {

  },
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
  aiButton: {
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
  // --- AI Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aiModalContainer: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  aiInstruction: {
    fontSize: 16,
    marginBottom: 15,
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  aiTextInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    minHeight: 50,
  },
  micButton: {
    padding: 10,
  },
  askAiButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  askAiButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aiLoadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  aiResultContainer: {
    marginTop: 10,
  },
  aiResultLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  recommendationCard: {
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendationDetail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  recommendationReason: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addToScheduleButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addToScheduleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // --- Toast Styles ---
  toastContainer: {
      position: 'absolute',
      bottom: 100, // Adjusted to be visible above bottom tabs
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      zIndex: 1000, // Ensure it's on top
  },
  toastText: {
      fontSize: 14,
      fontWeight: '600',
  }
});

export default HomeScreen;
