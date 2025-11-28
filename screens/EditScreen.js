import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; 
import { scheduleTaskNotification, cancelTaskNotification } from '../services/NotificationService';
import { updateTask } from '../services/Database';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EditScreen = ({ task, onClose }) => {
    const db = useSQLiteContext();
    const { colors } = useTheme();

    // --- Custom Alert State ---
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

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [category, setCategory] = useState(task.type);
    const [location, setLocation] = useState(task.location); 
    const [date, setDate] = useState(task.date ? new Date(task.date) : new Date());
    const [startDate, setStartDate] = useState(task.start_date ? new Date(task.start_date) : new Date());
    const [endDate, setEndDate] = useState(task.end_date ? new Date(task.end_date) : new Date());
    const [time, setTime] = useState(task.time ? new Date(`1970-01-01T${task.time.split(' ')[0]}:00`) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [categories, setCategories] = useState([]);
    const [repeatFrequency, setRepeatFrequency] = useState(task.repeat_frequency || 'none');
    const [repeatDays, setRepeatDays] = useState(task.repeat_days ? JSON.parse(task.repeat_days) : []);
    const [reminderMinutes, setReminderMinutes] = useState(task.reminder_minutes || 5);

    const screenTitle = task.type === 'Task' ? 'Edit Task' : 'Edit Schedule';
    const activeType = task.type === 'Task' ? 'Task' : 'Schedule';

    useEffect(() => {
        const fetchCategories = async () => {
            const staticCategories = [{name: 'Task'}, {name: 'Class'}, {name: 'Routine'}, {name: 'Meeting'}, {name: 'Work'}];
            setCategories(staticCategories);
        };
        fetchCategories();
    }, []);

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const onTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || time;
        setShowTimePicker(Platform.OS === 'ios');
        setTime(currentTime);
    };
    
    const handleStartDateChange = (event, selectedDate) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate);
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate);
        }
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
            setRepeatDays([]);
        } else {
            setRepeatDays(weekDays);
        }
    };

    const handleSaveTask = async () => {
        if (!title || !category) {
            showAlert('Error', 'Please fill in all fields.', 'error');
            return;
        }

        const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const formatTime = (d) => {
            const hours = d.getHours();
            const minutes = d.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
            const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
            return `${formattedHours}:${formattedMinutes} ${ampm}`;
        };

        let newNotificationId = task.notification_id;
        
        if (activeType === 'Task') {
            if (task.notification_id) {
                await cancelTaskNotification(task.notification_id);
            }
            newNotificationId = await scheduleTaskNotification(
                title, 
                formatDate(date), 
                formatTime(time), 
                reminderMinutes
            );
        }

        const originalTaskId = typeof task.id === 'string' ? parseInt(task.id.split('-')[0], 10) : task.id;

        const updatedTask = {
            id: originalTaskId,
            title,
            description,
            date: activeType === 'Task' ? formatDate(date) : formatDate(startDate),
            time: formatTime(time),
            type: category,
            location: location, 
            repeat_frequency: repeatFrequency,
            repeat_days: repeatFrequency === 'weekly' ? JSON.stringify(repeatDays) : null,
            start_date: activeType === 'Schedule' ? formatDate(startDate) : null,
            end_date: activeType === 'Schedule' ? formatDate(endDate) : null,
            notification_id: newNotificationId,
            reminder_minutes: reminderMinutes
        };

        try {
            await updateTask(db, updatedTask); 
            showAlert('Success', 'Task updated successfully!', 'success', [{
                text: 'OK',
                onPress: () => {
                    closeAlert();
                    onClose();
                }
            }]);
        } catch (error) {
            console.error("Failed to update task:", error);
            showAlert('Error', 'Failed to update task.', 'error');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.container}>
                
                {/* Fixed Header Section */}
                <View style={styles.fixedHeader}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{screenTitle}</Text>
                </View>

                {/* Scrollable Content Section */}
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Task Title Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="format-title" size={20} color={colors.textSecondary} />
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task Title</Text>
                        </View>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.textPrimary, borderColor: colors.border }]} 
                            value={title} 
                            onChangeText={setTitle} 
                            placeholder="e.g. Final Project" 
                            placeholderTextColor={colors.textSecondary} 
                        />
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="card-text-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                        </View>
                        <TextInput 
                            style={[styles.input, styles.multilineInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary, borderColor: colors.border }]} 
                            value={description} 
                            onChangeText={setDescription} 
                            multiline 
                            placeholder="e.g. Complete the documentation" 
                            placeholderTextColor={colors.textSecondary} 
                        />
                    </View>

                    {/* Location Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Location</Text>
                        </View>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.textPrimary, borderColor: colors.border }]} 
                            value={location} 
                            onChangeText={setLocation} 
                            placeholder="e.g. Home" 
                            placeholderTextColor={colors.textSecondary} 
                        />
                    </View>
                    
                    {/* Repeat Section - Only for Schedules */}
                    {activeType === 'Schedule' && (
                        <View>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>Repeat</Text>
                            <View style={[styles.repeatFrequencyContainer, { backgroundColor: colors.card }]}>
                                <TouchableOpacity onPress={() => setRepeatFrequency('none')} style={[styles.frequencyButton, repeatFrequency === 'none' && [styles.frequencyButtonSelected, { backgroundColor: colors.purpleAccent }]]}>
                                    <Text style={[styles.frequencyButtonText, { color: colors.purpleAccent }, repeatFrequency === 'none' && [styles.frequencyButtonTextSelected, { color: colors.card }]]}>None</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRepeatFrequency('daily')} style={[styles.frequencyButton, repeatFrequency === 'daily' && [styles.frequencyButtonSelected, { backgroundColor: colors.purpleAccent }]]}>
                                    <Text style={[styles.frequencyButtonText, { color: colors.purpleAccent }, repeatFrequency === 'daily' && [styles.frequencyButtonTextSelected, { color: colors.card }]]}>Daily</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRepeatFrequency('weekly')} style={[styles.frequencyButton, repeatFrequency === 'weekly' && [styles.frequencyButtonSelected, { backgroundColor: colors.purpleAccent }]]}>
                                    <Text style={[styles.frequencyButtonText, { color: colors.purpleAccent }, repeatFrequency === 'weekly' && [styles.frequencyButtonTextSelected, { color: colors.card }]]}>Weekly</Text>
                                </TouchableOpacity>
                            </View>
                            {repeatFrequency === 'weekly' &&
                            <View style={[styles.repeatContainer, { backgroundColor: colors.card }]}>
                                {weekDays.map((day, index) => (
                                    <TouchableOpacity key={index} onPress={() => handleRepeatDayToggle(day)} style={[styles.dayButton, repeatDays.includes(day) && [styles.dayButtonSelected, { backgroundColor: colors.purpleAccent }]]}>
                                        <Text style={[styles.dayText, { color: colors.purpleAccent }, repeatDays.includes(day) && [styles.dayTextSelected, { color: colors.card }]]}>{day.charAt(0)}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity 
                                    onPress={handleEverydayToggle} 
                                    style={[
                                        styles.everydayButton,
                                        repeatDays.length === weekDays.length && [styles.dayButtonSelected, { backgroundColor: colors.purpleAccent }]
                                    ]}
                                >
                                    <Text style={[
                                        styles.everydayText, { color: colors.purpleAccent },
                                        repeatDays.length === weekDays.length && [styles.dayTextSelected, { color: colors.card }]
                                    ]}>Everyday</Text>
                                </TouchableOpacity>
                            </View>
                            }
                        </View>
                    )}

                    {/* Category Picker */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="tag-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                        </View>
                        <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                            <Picker selectedValue={category} style={[styles.picker, { color: colors.textPrimary }]} onValueChange={(itemValue) => setCategory(itemValue)} dropdownIconColor={colors.textSecondary}>
                                {categories.map((cat, index) => (
                                    <Picker.Item key={index} label={cat.name} value={cat.name} color={colors.textPrimary} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Date and Time Pickers */}
                    {activeType === 'Task' ? (
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, styles.halfWidth]}>
                                <View style={styles.inputHeader}>
                                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Due Date</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputContainer, styles.halfWidth]}>
                                <View style={styles.inputHeader}>
                                    <MaterialCommunityIcons name="clock-time-four-outline" size={20} color={colors.textSecondary} />
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Due Time</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <View style={styles.row}>
                                <View style={[styles.inputContainer, styles.halfWidth]}>
                                    <View style={styles.inputHeader}>
                                        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Date</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                        <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{startDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.inputContainer, styles.halfWidth]}>
                                    <View style={styles.inputHeader}>
                                        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                        <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{endDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[styles.inputContainer]}>
                                <View style={styles.inputHeader}>
                                    <MaterialCommunityIcons name="clock-time-four-outline" size={20} color={colors.textSecondary} />
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {showDatePicker && <DateTimePicker testID="datePicker" value={date} mode="date" display="default" onChange={onDateChange} style={{ backgroundColor: colors.card }} />}
                    {showTimePicker && <DateTimePicker testID="timePicker" value={time} mode="time" display="default" onChange={onTimeChange} style={{ backgroundColor: colors.card }} />}
                    {showStartDatePicker && <DateTimePicker testID="startDatePicker" value={startDate} mode="date" display="default" onChange={handleStartDateChange} style={{ backgroundColor: colors.card }} />}
                    {showEndDatePicker && <DateTimePicker testID="endDatePicker" value={endDate} mode="date" display="default" onChange={handleEndDateChange} style={{ backgroundColor: colors.card }} />}

                    {/* Reminder Section */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Remind Me Before</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[0, 5, 10, 15, 30, 60].map((min) => (
                                <TouchableOpacity
                                    key={min}
                                    style={[
                                        styles.reminderChip,
                                        { borderColor: colors.border, backgroundColor: colors.inputBackground },
                                        reminderMinutes === min && { backgroundColor: colors.purpleAccent, borderColor: colors.purpleAccent }
                                    ]}
                                    onPress={() => setReminderMinutes(min)}
                                >
                                    <Text style={[
                                        styles.reminderText, 
                                        { color: colors.textPrimary },
                                        reminderMinutes === min && { color: colors.card, fontWeight: 'bold' }
                                    ]}>
                                        {min === 0 ? 'At time' : `${min} min`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.greenAccent }]} onPress={handleSaveTask}>
                            <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Save Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.cancelRed }]} onPress={onClose}>
                            <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Custom Alert Component */}
                <CustomAlert 
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    buttons={alertConfig.buttons}
                    onClose={closeAlert}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fixedHeader: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        marginLeft: 8,
    },
    input: {
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
    },
    picker: {
        height: 50,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        height: 54, 
        justifyContent: 'center',
    },
    dateButtonText: {
        fontSize: 16,
    },
    halfWidth: {
        width: '48%',
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 20, 
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    repeatFrequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
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
    },
    frequencyButtonText: {
        fontWeight: 'bold',
    },
    frequencyButtonTextSelected: {
    },
    repeatContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    },
    dayText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    dayTextSelected: {
    },
    everydayButton: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    everydayText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    reminderChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
    },
    reminderText: {
        fontSize: 14,
    },
});

export default EditScreen;