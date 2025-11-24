import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; // Correct import
import { updateTask } from '../services/Database';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EditScreen = ({ task, onClose }) => {
    const db = useSQLiteContext();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [category, setCategory] = useState(task.type);
    const [location, setLocation] = useState(task.location); // Add state for location
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
            setRepeatDays([]); // Deselect all
        } else {
            setRepeatDays(weekDays); // Select all
        }
    };


    const handleSaveTask = async () => {
        if (!title || !category) {
            Alert.alert('Error', 'Please fill in all fields.');
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

        const updatedTask = {
            id: task.id,
            title,
            description,
            date: activeType === 'Task' ? formatDate(date) : formatDate(startDate),
            time: formatTime(time),
            type: category,
            location: location, // Include location in updatedTask
            repeat_frequency: repeatFrequency,
            repeat_days: repeatFrequency === 'weekly' ? JSON.stringify(repeatDays) : null,
            start_date: activeType === 'Schedule' ? formatDate(startDate) : null,
            end_date: activeType === 'Schedule' ? formatDate(endDate) : null,
        };

        try {
            await updateTask(db, updatedTask); 
            Alert.alert('Success', 'Task updated successfully!');
            onClose();
        } catch (error) {
            console.error("Failed to update task:", error);
            Alert.alert('Error', 'Failed to update task.');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.headerTitle}>{screenTitle}</Text>

            {/* Task Title Input */}
            <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                    <MaterialCommunityIcons name="format-title" size={20} color="#6D6D72" />
                    <Text style={styles.inputLabel}>Task Title</Text>
                </View>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Final Project" placeholderTextColor="#C7C7CC" />
            </View>

            {/* Description Input */}
            <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                    <MaterialCommunityIcons name="card-text-outline" size={20} color="#6D6D72" />
                    <Text style={styles.inputLabel}>Description</Text>
                </View>
                <TextInput style={[styles.input, styles.multilineInput]} value={description} onChangeText={setDescription} multiline placeholder="e.g. Complete the documentation" placeholderTextColor="#C7C7CC" />
            </View>

            {/* Location Input */}
            <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color="#6D6D72" />
                    <Text style={styles.inputLabel}>Location</Text>
                </View>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Home" placeholderTextColor="#C7C7CC" />
            </View>
            
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


            {/* Category Picker */}
            <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                    <MaterialCommunityIcons name="tag-outline" size={20} color="#6D6D72" />
                    <Text style={styles.inputLabel}>Category</Text>
                </View>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={category} style={styles.picker} onValueChange={(itemValue) => setCategory(itemValue)} dropdownIconColor="#E0E0E0">
                        {categories.map((cat, index) => (
                            <Picker.Item key={index} label={cat.name} value={cat.name} />
                        ))}
                    </Picker>
                </View>
            </View>

            {/* Date and Time Pickers */}
            {activeType === 'Task' ? (
                <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6D6D72" />
                            <Text style={styles.inputLabel}>Due Date</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                            <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#6D6D72" />
                            <Text style={styles.inputLabel}>Due Time</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateButton}>
                            <Text style={styles.dateButtonText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View>
                    <View style={styles.row}>
                        <View style={[styles.inputContainer, styles.halfWidth]}>
                            <View style={styles.inputHeader}>
                                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6D6D72" />
                                <Text style={styles.inputLabel}>Start Date</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
                                <Text style={styles.dateButtonText}>{startDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.inputContainer, styles.halfWidth]}>
                            <View style={styles.inputHeader}>
                                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6D6D72" />
                                <Text style={styles.inputLabel}>End Date</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
                                <Text style={styles.dateButtonText}>{endDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                     <View style={[styles.inputContainer]}>
                        <View style={styles.inputHeader}>
                            <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#6D6D72" />
                            <Text style={styles.inputLabel}>Time</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateButton}>
                            <Text style={styles.dateButtonText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {showDatePicker && <DateTimePicker testID="datePicker" value={date} mode="date" display="default" onChange={onDateChange} />}
            {showTimePicker && <DateTimePicker testID="timePicker" value={time} mode="time" display="default" onChange={onTimeChange} />}
            {showStartDatePicker && <DateTimePicker testID="startDatePicker" value={startDate} mode="date" display="default" onChange={handleStartDateChange} />}
            {showEndDatePicker && <DateTimePicker testID="endDatePicker" value={endDate} mode="date" display="default" onChange={handleEndDateChange} />}


            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveTask}>
                    <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7', // Light background
    },
    contentContainer: {
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#000000', // Dark text color
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
        color: '#6D6D72',
        fontSize: 14,
        marginLeft: 8,
    },
    input: {
        backgroundColor: '#FFFFFF', // White input background
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        color: '#000000', // Dark input text
        borderWidth: 1,
        borderColor: '#C7C7CC',
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C7C7CC',
        justifyContent: 'center',
    },
    picker: {
        color: '#000000',
        height: 50,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateButton: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C7C7CC',
        height: 54, // Match input height
        justifyContent: 'center',
    },
    dateButtonText: {
        color: '#000000',
        fontSize: 16,
    },
    halfWidth: {
        width: '48%',
    },
    buttonContainer: {
        marginTop: 20,
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
    saveButton: {
        backgroundColor: '#34C759', // A vibrant green
    },
    cancelButton: {
        backgroundColor: '#FF3B30', // A vibrant red
    },
    repeatFrequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#007AFF',
    },
    frequencyButtonText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    frequencyButtonTextSelected: {
        color: '#FFFFFF',
    },
    repeatContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#007AFF',
    },
    dayText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    dayTextSelected: {
        color: '#FFFFFF',
    },
    everydayButton: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    everydayText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default EditScreen;
