import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addTask } from '../services/Database';
import { ChevronLeft, Check, Calendar, Clock, Briefcase, BookOpen, Repeat, Users, CheckSquare, MapPin } from 'lucide-react-native'; 

// --- Constants (Copied for consistency) ---
const DarkColors = {
  background: '#121212', 
  card: '#1F1F1F',      
  textPrimary: '#FFFFFF', 
  textSecondary: '#A9A9A9', 
  accentOrange: '#FF9500', // Primary accent color
  progressRed: '#FF4500',  
  tabActive: '#333333',    
  purpleAccent: '#5F50A9', // A darker purple/indigo for the main button background
  greenAccent: '#4CAF50',
  blueAccent: '#00BFFF',
  yellowAccent: '#FFC72C',
};

// Category definitions based on type
const scheduleCategories = [
    { name: 'Class', icon: BookOpen, color: DarkColors.accentOrange },
    { name: 'Routine', icon: Repeat, color: DarkColors.blueAccent },
    { name: 'Meeting', icon: Users, color: DarkColors.greenAccent },
    { name: 'Work', icon: Briefcase, color: DarkColors.purpleAccent },
];

const taskCategories = [
    { name: 'Task', icon: CheckSquare, color: DarkColors.yellowAccent },
];

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddScreen = ({ navigation, route, user: userProp }) => {
    const db = useSQLiteContext();
    const user = route.params?.user || userProp;

    // State to toggle between Task and Schedule
    const [activeType, setActiveType] = useState('Task'); 
    // State for form fields
    const [taskTitle, setTaskTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(taskCategories[0].name);
    const [description, setDescription] = useState('');
    const [repeatFrequency, setRepeatFrequency] = useState('none');
    const [repeatDays, setRepeatDays] = useState([]);
    
    // Date and Time states
    const [date, setDate] = useState(new Date()); // For Task's due date
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const handleTypeChange = (type) => {
        setActiveType(type);
        // Reset selected category to the first one of the new type
        if (type === 'Task') {
            setSelectedCategory(taskCategories[0].name);
        } else {
            setSelectedCategory(scheduleCategories[0].name);
        }
        setRepeatDays([]); // Reset repeat days on type change
    };

    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [dueDate, setDueDate] = useState(formatDate(new Date()));
    const [startDateString, setStartDateString] = useState(formatDate(new Date()));
    const [endDateString, setEndDateString] = useState(formatDate(new Date()));
    const [dueTime, setDueTime] = useState(formatTime(new Date()));
    const [location, setLocation] = useState('');


    // Helper component for category buttons
    const CategoryButton = ({ item }) => {
        const isActive = selectedCategory === item.name;
        return (
            <TouchableOpacity 
                style={[
                    styles.categoryButton, 
                    isActive && { backgroundColor: item.color }
                ]}
                onPress={() => setSelectedCategory(item.name)}
            >
                <item.icon size={24} color={isActive ? DarkColors.textPrimary : item.color} />
                <Text style={[styles.categoryText, { color: isActive ? DarkColors.textPrimary : DarkColors.textSecondary }]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
            setDueDate(formatDate(selectedDate));
        }
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate);
            setStartDateString(formatDate(selectedDate));
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate);
            setEndDateString(formatDate(selectedDate));
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setTime(selectedTime);
            setDueTime(formatTime(selectedTime));
        }
    };

    const handleOpenMap = () => {
        // This is a placeholder. You can replace this with navigation to a map screen or opening a modal.
        Alert.alert("Open Map", "This will open a map to select a location.");
    };

    const handleRepeatDayToggle = (day) => {
        setRepeatDays(prevDays => {
            if (prevDays.includes(day)) {
                return prevDays.filter(d => d !== day);
            } else {
                return [...prevDays, day];
            }
        });
    };

    const handleEverydayToggle = () => {
        if (repeatDays.length === weekDays.length) {
            setRepeatDays([]); // Deselect all
        } else {
            setRepeatDays(weekDays); // Select all
        }
    };

    // Placeholder for adding task/schedule
    const handleAdd = async () => {
        if (!taskTitle.trim()) {
            Alert.alert('Validation Error', 'Task title is required.');
            return;
        }
        if (!user?.id) {
            Alert.alert('Error', 'User not found. Please log in again.');
            return;
        }

        try {
            await addTask(db, {
                title: taskTitle,
                description: description,
                date: activeType === 'Task' ? dueDate : startDateString,
                time: dueTime,
                type: selectedCategory,
                location: location,
                userId: user.id,
                repeat_frequency: repeatFrequency,
                repeat_days: repeatFrequency === 'weekly' ? JSON.stringify(repeatDays) : null,
                start_date: activeType === 'Schedule' ? startDateString : null,
                end_date: activeType === 'Schedule' ? endDateString : null,
            });
            Alert.alert('Success', `${activeType} added successfully!`);
            navigation.goBack();
        } catch (error) {
            console.error('Failed to add task:', error);
            Alert.alert('Error', `Failed to add ${activeType}. Please try again.`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Section - This part stays fixed */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()}>
                    <ChevronLeft size={28} color={DarkColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add</Text>
            </View>

            {/* Subtitle/Instruction - This part also stays fixed */}
            <Text style={styles.subtitle}>
                Add your schedule or task to stay organized and on track.
            </Text>

            {/* Task/Schedule Segmented Control - Now part of the fixed header area */}
            <View style={styles.segmentedControl}>
                <TouchableOpacity 
                    style={[styles.segment, activeType === 'Task' && styles.segmentActive]}
                    onPress={() => handleTypeChange('Task')}
                >
                    <Check size={20} color={activeType === 'Task' ? DarkColors.textPrimary : DarkColors.textSecondary} />
                    <Text style={[styles.segmentText, activeType === 'Task' && styles.segmentTextActive]}>Task</Text>
                    {activeType === 'Task' && <View style={styles.segmentUnderline} />}
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.segment, activeType === 'Schedule' && styles.segmentActive]}
                    onPress={() => handleTypeChange('Schedule')}
                >
                    <Calendar size={20} color={activeType === 'Schedule' ? DarkColors.textPrimary : DarkColors.textSecondary} />
                    <Text style={[styles.segmentText, activeType === 'Schedule' && styles.segmentTextActive]}>Schedule</Text>
                    {activeType === 'Schedule' && <View style={styles.segmentUnderline} />}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust as needed
            >
                {/* The rest of the content is scrollable */}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Form Fields */}

                    {/* Task Title */}
                    <Text style={styles.label}>{activeType === 'Schedule' ? 'Schedule Title' : 'Task title'}</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder={activeType === 'Schedule' ? 'Enter schedule title' : 'Enter task title'}
                        placeholderTextColor={DarkColors.textSecondary}
                        value={taskTitle}
                        onChangeText={setTaskTitle}
                    />

                    {/* Category Selection */}
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                        {(activeType === 'Task' ? taskCategories : scheduleCategories).map(item => (
                            <CategoryButton key={item.name} item={item} />
                        ))}
                    </View>
                    
                    {/* Description */}
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder={activeType === 'Task' ? 'Describe your task' : 'Describe your schedule'}
                        placeholderTextColor={DarkColors.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />

                    {/* Repeat Section - Only for Schedules */}
                    {activeType === 'Schedule' && (
                        <View>
                            <Text style={styles.label}>Repeat</Text>
                            <View style={styles.repeatFrequencyContainer}>
                                <TouchableOpacity onPress={() => setRepeatFrequency('none')} style={[styles.frequencyButton, repeatFrequency === 'none' && styles.frequencyButtonSelected]}>
                                    <Text style={[styles.frequencyButtonText, repeatFrequency === 'none' && styles.frequencyButtonTextSelected]}>None</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRepeatFrequency('daily')} style={[styles.frequencyButton, repeatFrequency === 'daily' && styles.frequencyButtonSelected]}>
                                    <Text style={[styles.frequencyButtonText, repeatFrequency === 'daily' && styles.frequencyButtonTextSelected]}>Daily</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRepeatFrequency('weekly')} style={[styles.frequencyButton, repeatFrequency === 'weekly' && styles.frequencyButtonSelected]}>
                                    <Text style={[styles.frequencyButtonText, repeatFrequency === 'weekly' && styles.frequencyButtonTextSelected]}>Weekly</Text>
                                </TouchableOpacity>
                            </View>
                            {repeatFrequency === 'weekly' &&
                            <View style={styles.repeatContainer}>
                                {weekDays.map((day, index) => (
                                    <TouchableOpacity key={index} onPress={() => handleRepeatDayToggle(day)} style={[styles.dayButton, repeatDays.includes(day) && styles.dayButtonSelected]}>
                                        <Text style={[styles.dayText, repeatDays.includes(day) && styles.dayTextSelected]}>{day.charAt(0)}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity 
                                    onPress={handleEverydayToggle} 
                                    style={[
                                        styles.everydayButton,
                                        repeatDays.length === weekDays.length && styles.dayButtonSelected
                                    ]}
                                >
                                    <Text style={[
                                        styles.everydayText,
                                        repeatDays.length === weekDays.length && styles.dayTextSelected
                                    ]}>Everyday</Text>
                                </TouchableOpacity>
                            </View>
                            }
                        </View>
                    )}

                    {/* Time and Date Section */}
                    <View style={styles.dateTimeContainer}>
                        <View style={styles.dateTimeInputGroup}>
                            <Text style={styles.label}>{activeType === 'Schedule' ? 'Time' : 'Due Time'}</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateTimeWrapper}>
                                <Clock size={20} color={DarkColors.textSecondary} style={styles.iconInInput} />
                                <Text style={[styles.textInput, styles.dateTimeText]}>{dueTime}</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {activeType === 'Task' ? (
                            <View style={styles.dateTimeInputGroup}>
                                <Text style={styles.label}>Due Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateTimeWrapper}>
                                    <Calendar size={20} color={DarkColors.textSecondary} style={styles.iconInInput} />
                                    <Text style={[styles.textInput, styles.dateTimeText]}>{dueDate}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.scheduleDateContainer}>
                                <View style={styles.dateTimeInputGroup}>
                                    <Text style={styles.label}>Start Date</Text>
                                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateTimeWrapper}>
                                        <Calendar size={20} color={DarkColors.textSecondary} style={styles.iconInInput} />
                                        <Text style={[styles.textInput, styles.dateTimeText]}>{startDateString}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateTimeInputGroup}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateTimeWrapper}>
                                        <Calendar size={20} color={DarkColors.textSecondary} style={styles.iconInInput} />
                                        <Text style={[styles.textInput, styles.dateTimeText]}>{endDateString}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            testID="datePicker"
                            value={date}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            textColor={DarkColors.textPrimary}
                            style={{ backgroundColor: DarkColors.card }}
                        />
                    )}

                    {showStartDatePicker && (
                        <DateTimePicker
                            testID="startDatePicker"
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={handleStartDateChange}
                            textColor={DarkColors.textPrimary}
                            style={{ backgroundColor: DarkColors.card }}
                        />
                    )}

                    {showEndDatePicker && (
                        <DateTimePicker
                            testID="endDatePicker"
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={handleEndDateChange}
                            textColor={DarkColors.textPrimary}
                            style={{ backgroundColor: DarkColors.card }}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            testID="timePicker"
                            value={time}
                            mode="time"
                            display="default"
                            onChange={handleTimeChange}
                            textColor={DarkColors.textPrimary}
                            style={{ backgroundColor: DarkColors.card }}
                        />
                    )}


                    {/* Location */}
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.locationInputContainer}>
                        <TextInput
                            style={[styles.textInput, styles.locationInput]}
                            placeholder="Type or select from map"
                            placeholderTextColor={DarkColors.textSecondary}
                            value={location}
                            onChangeText={setLocation}
                        />
                        <TouchableOpacity onPress={handleOpenMap} style={styles.mapIcon}>
                            <MapPin size={22} color={DarkColors.accentOrange} />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleAdd}
                    >
                        <Text style={styles.addButtonText}>Add {activeType}</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DarkColors.background,
        paddingHorizontal: 20,
    },
    
    // --- Header ---
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        marginBottom: 10,
    },
    headerTitle: {
        color: DarkColors.textPrimary,
        fontSize: 30,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    subtitle: {
        color: DarkColors.textSecondary,
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },

    // --- Segmented Control (Task/Schedule) ---
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: DarkColors.card,
        borderRadius: 10,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: DarkColors.purpleAccent,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        position: 'relative',
    },
    segmentActive: {
        // No background change, only bottom underline
    },
    segmentText: {
        color: DarkColors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    segmentTextActive: {
        color: DarkColors.textPrimary,
    },
    segmentUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: DarkColors.accentOrange,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },

    // --- Form Elements ---
    label: {
        color: DarkColors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: DarkColors.card,
        color: DarkColors.textPrimary,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        marginBottom: 20,
    },
    textArea: {
        backgroundColor: DarkColors.card,
        color: DarkColors.textPrimary,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        height: 100, // Fixed height for description
        marginBottom: 20,
    },

    // --- Category Chips ---
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    categoryButton: {
        width: '23%', 
        backgroundColor: DarkColors.card,
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 5,
    },

    // --- Repeat Section ---
    repeatFrequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: DarkColors.card,
        borderRadius: 10,
        padding: 5,
        marginBottom: 10,
    },
    frequencyButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
    },
    frequencyButtonSelected: {
        backgroundColor: DarkColors.purpleAccent,
    },
    frequencyButtonText: {
        color: DarkColors.textSecondary,
        fontWeight: 'bold',
    },
    frequencyButtonTextSelected: {
        color: DarkColors.textPrimary,
    },
    repeatContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: DarkColors.card,
        borderRadius: 10,
        padding: 10,
        marginBottom: 20,
    },
    dayButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    dayButtonSelected: {
        backgroundColor: DarkColors.purpleAccent,
    },
    dayText: {
        color: DarkColors.textSecondary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    dayTextSelected: {
        color: DarkColors.textPrimary,
    },
    everydayButton: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    everydayText: {
        color: DarkColors.textSecondary,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // --- Date/Time Inputs ---
    dateTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap', // Allows items to wrap to the next line
        marginBottom: 20,
    },
    scheduleDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    dateTimeInputGroup: {
        width: '48%',
        marginBottom: 15, // Add margin for when items wrap
    },
    iconInInput: {
        position: 'absolute',
        left: 15,
        zIndex: 1,
    },
    dateTimeText: {
        // Inherits from textInput, but we adjust padding and remove margin
        paddingLeft: 45,
        marginBottom: 0,
        paddingVertical: 0, // Remove vertical padding to rely on height
        height: 50, // Fixed height
        textAlignVertical: 'center',
    },
    dateTimeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        // The textInput style is now applied to the Text component inside
    },

    // --- Location Input ---
    locationInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 20,
    },
    locationInput: {
        flex: 1,
        paddingRight: 50, // Make space for the icon
        marginBottom: 0, // Override default margin from textInput
    },
    mapIcon: {
        position: 'absolute',
        right: 0,
        padding: 15, // Makes the touch target larger
    },

    // --- Submit Button ---
    addButton: {
        backgroundColor: DarkColors.purpleAccent, // Use a distinct color for the final action button
        borderRadius: 10,
        padding: 18,
        alignItems: 'center',
        marginVertical: 30,
        shadowColor: DarkColors.purpleAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
    addButtonText: {
        color: DarkColors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddScreen;