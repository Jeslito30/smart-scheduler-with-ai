import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { MapPin, Clock, Calendar, Check, Edit, X } from 'lucide-react-native';

const LightColors = {
  card: '#FFFFFF',
  textPrimary: '#1F1F1F',
  textSecondary: '#6B7280',
  accentOrange: '#FF9500',
  greenAccent: '#4CAF50',
  yellowAccent: '#FFC72C',
  blueAccent: '#00BFFF',
  purpleAccent: '#5F50A9',
  cancelRed: '#D32F2F',
};

const getCategoryTagColor = (type) => {
  switch (type) {
    case 'Task': return LightColors.yellowAccent;
    case 'Class': return LightColors.accentOrange;
    case 'Routine': return LightColors.blueAccent;
    case 'Meeting': return LightColors.greenAccent;
    case 'Work': return LightColors.purpleAccent;
    default: return LightColors.textSecondary;
  }
};

export const TaskCard = ({ id, type, title, description, time, location, date, deadline, status, onDone, onEdit }) => {
  const [remainingTime, setRemainingTime] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate - now;

      if (diff <= 0) {
        // If deadline passed, set state and stop the timer
        setIsPastDeadline(true);
        // Only 'Task' types can be "Missed"
        if (type === 'Task') {
          setRemainingTime('Missed');
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setRemainingTime(`Remaining Time: ${days}d ${hours}h`);
      } else if (hours > 0) {
        setRemainingTime(`Remaining Time: ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setRemainingTime(`Remaining Time: ${minutes}m`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTime(`${seconds}s`);
      }
    };

    // Only run the timer if the task is not done and the deadline has not passed
    if (status !== 'done' && !isPastDeadline) {
      const interval = setInterval(calculateRemainingTime, 1000);
      return () => clearInterval(interval);
    }
  }, [deadline, status, isPastDeadline, type]);

  const handleLongPress = () => {
    setIsEditing(prevState => !prevState);
  };

  const handleDonePress = () => {
    onDone(id);
    setIsEditing(false);
  };

  const handleEditPress = () => {
    onEdit({ 
        id, 
        type, 
        title, 
        description, 
        time, 
        location, 
        date, 
        deadline, 
        status 
    });
    setIsEditing(false);
  };

  const handleCancelPress = () => {
    setIsEditing(false);
  };

  return (
    <Pressable onLongPress={handleLongPress} onPress={() => isEditing && setIsEditing(false)} delayLongPress={300}>
      <View style={[styles.card, isEditing && styles.cardEditing]}>
        {isEditing ? (
          <View style={styles.actionsContainer}>
            {type === 'Task' && status !== 'done' && (
              <TouchableOpacity style={[styles.actionButton, styles.doneButton]} onPress={handleDonePress}>
                <Check size={24} color={LightColors.card} />
                <Text style={styles.actionButtonText}>Done</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEditPress} activeOpacity={0.7}>
              <Edit size={24} color={LightColors.card} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancelPress} activeOpacity={0.7}>
              <X size={24} color={LightColors.card} />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cardContent} pointerEvents="none">
              <View style={styles.topRow}>
                <View style={[styles.tagContainer, { backgroundColor: getCategoryTagColor(type) }]}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
                <View style={styles.locationContainer}>
                  <MapPin size={16} color={LightColors.textSecondary} style={styles.locationIcon} />
                  {location ? <Text style={styles.locationText}>{location}</Text> : null}
                </View>
              </View>
              <Text style={styles.titleText}>{title}</Text>
              {description && (
                <>
                  <Text style={styles.detailsText}>{description}</Text>
                  <View style={styles.horizontalLine} />
                </>
              )}
              <View style={styles.timeRow}>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.timeDetail}>
                    <Calendar size={14} color={LightColors.textSecondary} style={styles.timeIcon} />
                    <Text style={styles.timeText}>{date}</Text>
                  </View>
                  <View style={styles.timeDetail}>
                    <Clock size={14} color={LightColors.textSecondary} style={styles.timeIcon} />
                    <Text style={styles.timeText}>{time}</Text>
                  </View>
                </View>
                {status === 'done' ? (
                  <Text style={styles.doneText}>Done</Text>
                ) : isPastDeadline && type !== 'Task' ? (
                  <Text style={styles.doneText}>Done</Text>
                ) : (
                  <Text style={[styles.remainingText, remainingTime === 'Missed' && { color: LightColors.cancelRed }]}>{remainingTime}</Text>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: LightColors.card,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden', // Ensures buttons don't bleed out of rounded corners
  },
  cardEditing: {
    padding: 0,
  },
  cardContent: {
    padding: 14, // Apply padding to the content wrapper instead of the main card
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // New styles for the category tag
  tagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15, // Creates the oblong shape
    alignSelf: 'flex-start', // Ensures the badge only takes up as much space as its content
  },
  tagText: {
    color: LightColors.card,
    fontSize: 14, // Same size as description
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    color: LightColors.textSecondary,
    fontSize: 13,
  },
  titleText: {
    color: LightColors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8, // Add space below the title
  },
  detailsText: {
    color: LightColors.textSecondary,
    fontSize: 14,
  },
  horizontalLine: {
    height: 1,
    backgroundColor: LightColors.textSecondary,
    opacity: 0.2,
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  timeDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
  },
  timeIcon: {
      marginRight: 4,
  },
  timeText: {
    color: LightColors.textSecondary,
    fontSize: 12,
  },
  remainingText: {
    color: LightColors.accentOrange,
    fontWeight: 'bold',
    fontSize: 12,
  },
  doneText: {
    color: LightColors.greenAccent,
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Styles for the action buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    height: 150, // Set a fixed height for the editing state
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  doneButton: {
    backgroundColor: LightColors.greenAccent,
  },
  editButton: {
    backgroundColor: LightColors.accentOrange,
  },
  cancelButton: {
    backgroundColor: LightColors.cancelRed,
  },
  actionButtonText: {
    color: LightColors.card,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
});