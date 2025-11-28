import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { MapPin, Clock, Calendar, Check, Edit, X, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const getCategoryTagColor = (type) => {
  switch (type) {
    case 'Task': return '#FFC72C'; // yellowAccent
    case 'Class': return '#FF9500'; // accentOrange
    case 'Routine': return '#00BFFF'; // blueAccent
    case 'Meeting': return '#4CAF50'; // greenAccent
    case 'Work': return '#5F50A9'; // purpleAccent
    default: return '#6B7280'; // textSecondary
  }
};

export const TaskCard = ({ id, type, title, description, time, location, date, deadline, status, onDone, onEdit, onDelete }) => {
  const { colors } = useTheme();
  const [remainingTime, setRemainingTime] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate - now;

      if (diff <= 0) {
        setIsPastDeadline(true);
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

  const handleDeletePress = () => {
    if (onDelete) {
        onDelete(id);
    }
    setIsEditing(false);
  };

  const handleCancelPress = () => {
    setIsEditing(false);
  };

  return (
    <Pressable onLongPress={handleLongPress} onPress={() => isEditing && setIsEditing(false)} delayLongPress={300}>
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }, isEditing && styles.cardEditing]}>
        {isEditing ? (
          <View style={styles.actionsContainer}>
            {type === 'Task' && status !== 'done' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.greenAccent }]} onPress={handleDonePress}>
                <Check size={24} color={colors.card} />
                <Text style={styles.actionButtonText}>Done</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accentOrange }]} onPress={handleEditPress} activeOpacity={0.7}>
              <Edit size={24} color={colors.card} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.cancelRed }]} onPress={handleDeletePress} activeOpacity={0.7}>
              <Trash2 size={24} color={colors.card} />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.textSecondary }]} onPress={handleCancelPress} activeOpacity={0.7}>
              <X size={24} color={colors.card} />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cardContent} pointerEvents="none">
              <View style={styles.topRow}>
                <View style={[styles.tagContainer, { backgroundColor: getCategoryTagColor(type) || colors.textSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.card }]}>{type}</Text>
                </View>
                <View style={styles.locationContainer}>
                  <MapPin size={16} color={colors.textSecondary} style={styles.locationIcon} />
                  {location ? <Text style={[styles.locationText, { color: colors.textSecondary }]}>{location}</Text> : null}
                </View>
              </View>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title}</Text>
              {description && (
                <>
                  <Text style={[styles.detailsText, { color: colors.textSecondary }]}>{description}</Text>
                  <View style={[styles.horizontalLine, { backgroundColor: colors.textSecondary }]} />
                </>
              )}
              <View style={styles.timeRow}>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.timeDetail}>
                    <Calendar size={14} color={colors.textSecondary} style={styles.timeIcon} />
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>{date}</Text>
                  </View>
                  <View style={styles.timeDetail}>
                    <Clock size={14} color={colors.textSecondary} style={styles.timeIcon} />
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>{time}</Text>
                  </View>
                </View>
                {status === 'done' ? (
                  <Text style={[styles.doneText, { color: colors.greenAccent }]}>Done</Text>
                ) : isPastDeadline && type !== 'Task' ? (
                  <Text style={[styles.doneText, { color: colors.greenAccent }]}>Done</Text>
                ) : (
                  <Text style={[styles.remainingText, { color: colors.accentOrange }, remainingTime === 'Missed' && { color: colors.cancelRed }]}>{remainingTime}</Text>
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
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden', 
  },
  cardEditing: {
    padding: 0,
  },
  cardContent: {
    padding: 14,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 14,
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
    fontSize: 13,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
  },
  horizontalLine: {
    height: 1,
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
    fontSize: 12,
  },
  remainingText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  doneText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    height: 150,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    fontSize: 14, 
    fontWeight: 'bold',
    marginTop: 8,
  },
});