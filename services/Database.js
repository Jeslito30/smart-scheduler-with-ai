export const initDB = async (db) => {
  try {
    await db.execAsync(`
      
      -- Create the users table if it doesn't exist
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        profile_picture TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        userId INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      );
      -- Optional: Set journal mode for performance
      PRAGMA journal_mode=WAL;
    `);
    console.log("Database tables ensured/created.");

    // Migration: Add location column if it doesn't exist
    const tableInfo = await db.getAllAsync("PRAGMA table_info(tasks);");
    const hasLocationColumn = tableInfo.some(info => info.name === 'location');
    const hasRepeatFrequencyColumn = tableInfo.some(info => info.name === 'repeat_frequency');
    const hasRepeatDaysColumn = tableInfo.some(info => info.name === 'repeat_days');
    const hasStartDateColumn = tableInfo.some(info => info.name === 'start_date');
    const hasEndDateColumn = tableInfo.some(info => info.name === 'end_date');


    if (!hasLocationColumn) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN location TEXT;");
      console.log("Added 'location' column to 'tasks' table.");
    }
    if (!hasRepeatFrequencyColumn) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN repeat_frequency TEXT DEFAULT 'none';");
      console.log("Added 'repeat_frequency' column to 'tasks' table.");
    }
    if (!hasRepeatDaysColumn) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN repeat_days TEXT;");
      console.log("Added 'repeat_days' column to 'tasks' table.");
    }
    if (!hasStartDateColumn) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN start_date TEXT;");
      console.log("Added 'start_date' column to 'tasks' table.");
    }
    if (!hasEndDateColumn) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN end_date TEXT;");
      console.log("Added 'end_date' column to 'tasks' table.");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};


export const insertUser = async (db, name, email, password) => {
  try {
    await db.runAsync(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );
    const result = await db.getFirstAsync('SELECT id, name, email FROM users WHERE email = ?', [email]);
    return result;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
      throw new Error('This email is already registered.');
    }
    console.error("Database insert user error:", error);
    throw error;
  }
};

export const getUser = async (db, email, password) => {
  try {
    const users = await db.getAllAsync(
      'SELECT id, name, email, profile_picture FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    return users; 
  } catch (error) {
    console.error("Database get user error:", error);
    throw error;
  }
  };

export const addTask = async (db, task) => {
  try {
    const { title, description, date, time, type, location, userId, repeat_frequency, repeat_days, start_date, end_date } = task;
    await db.runAsync(
      'INSERT INTO tasks (title, description, date, time, type, location, userId, repeat_frequency, repeat_days, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, date, time, type, location, userId, repeat_frequency, repeat_days, start_date, end_date]
    );
  } catch (error) {
    console.error("Database add task error:", error);
    throw error;
  }
};

export const getTasks = async (db, userId, type) => {
  try {
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE userId = ? AND type = ?',
      [userId, type]
    );
    return tasks;
  } catch (error) {
    console.error("Database get tasks error:", error);
    throw error;
  }
};

export const getAllTasks = async (db, userId) => {
  try {
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE userId = ?',
      [userId]
    );
    return tasks;
  } catch (error) {
    console.error("Database get all tasks error:", error);
    throw error;
  }
};

export const getTasksByDate = async (db, userId, date) => {
  try {
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE userId = ? AND date = ?',
      [userId, date]
    );
    return tasks;
  } catch (error) {
    console.error("Database get tasks by date error:", error);
    throw error;
  }
};

export const getUpcomingTasks = async (db, userId, date) => {
  try {
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE userId = ? AND date > ?',
      [userId, date]
    );
    return tasks;
  } catch (error) {
    console.error("Database get upcoming tasks error:", error);
    throw error;
  }
};

export const getCompletedTasks = async (db, userId) => {
  try {
    const tasks = await db.getAllAsync(
      "SELECT * FROM tasks WHERE userId = ? AND status = 'done'",
      [userId]
    );
    return tasks;
  } catch (error) {
    console.error("Database get completed tasks error:", error);
    throw error;
  }
};

export const getMissedTasks = async (db, userId) => {
  try {
    const tasks = await db.getAllAsync(
      `SELECT * FROM tasks 
       WHERE userId = ? 
       AND status = 'pending' 
       AND type = 'Task'`,
      [userId]
    );
    return tasks;
  } catch (error) {
    console.error("Database get missed tasks error:", error);
    throw error;
  }
}

export const updateTaskStatus = async (db, taskId, status) => {
  try {
    await db.runAsync(
      'UPDATE tasks SET status = ? WHERE id = ?',
      [status, taskId]
    );
  } catch (error) {
    console.error("Database update task status error:", error);
    throw error;
  }
};

export const updateProfilePicture = async (db, userId, profilePicture) => {
  try {
    await db.runAsync(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePicture, userId]
    );
  } catch (error) {
    console.error("Database update profile picture error:", error);
    throw error;
  }
};

export const updateTask = async (db, task) => {
  try {
    const { id, title, description, date, time, type, location, repeat_frequency, repeat_days, start_date, end_date } = task;
    await db.runAsync(
      'UPDATE tasks SET title = ?, description = ?, date = ?, time = ?, type = ?, location = ?, repeat_frequency = ?, repeat_days = ?, start_date = ?, end_date = ? WHERE id = ?',
      [title, description, date, time, type, location, repeat_frequency, repeat_days, start_date, end_date, id]
    );
  } catch (error) {
    console.error("Database update task error:", error);
    throw error;
  }
};

// Helper to parse date strings (YYYY-MM-DD)
const parseDate = (dateString) => new Date(dateString);

// Helper to format date objects to YYYY-MM-DD
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getRepeatingTasksInDateRange = async (db, userId, rangeStartDate, rangeEndDate) => {
  try {
    const allTasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE userId = ?',
      [userId]
    );

    const generatedTasks = [];
    const parsedRangeStartDate = parseDate(rangeStartDate);
    const parsedRangeEndDate = parseDate(rangeEndDate);

    for (const task of allTasks) {
      if (task.repeat_frequency === 'none' || !task.repeat_frequency) {
        // Add non-repeating tasks if their date falls within the range
        const taskDate = parseDate(task.date);
        if (taskDate >= parsedRangeStartDate && taskDate <= parsedRangeEndDate) {
            generatedTasks.push(task);
        }
      } else {
        // Handle repeating tasks
        const taskStartDate = task.start_date ? parseDate(task.start_date) : parseDate(task.date);
        const taskEndDate = task.end_date ? parseDate(task.end_date) : null;
        const originalTime = task.time; // Store original time

        let currentDate = new Date(taskStartDate);
        while (currentDate <= parsedRangeEndDate && (!taskEndDate || currentDate <= taskEndDate)) {
          // Check if current date is within the overall repeat range and within the requested display range
          if (currentDate >= parsedRangeStartDate) {
            let shouldAdd = false;
            if (task.repeat_frequency === 'daily') {
              shouldAdd = true;
            } else if (task.repeat_frequency === 'weekly' && task.repeat_days) {
              const repeatDaysArray = JSON.parse(task.repeat_days); // Assuming repeat_days is stored as a JSON string array like '["Mon", "Wed"]'
              const dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'short' }); // e.g., 'Mon'
              if (repeatDaysArray.includes(dayOfWeek)) {
                shouldAdd = true;
              }
            }

            if (shouldAdd) {
              generatedTasks.push({
                ...task,
                // Override the date with the generated occurrence date
                date: formatDate(currentDate),
                // Ensure time is preserved, as it's not generated
                time: originalTime,
                // Assign a unique ID for rendering, combining original task ID and occurrence date
                id: `${task.id}-${formatDate(currentDate)}`,
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
        }
      }
    }
    return generatedTasks;
  } catch (error) {
    console.error("Database get repeating tasks in date range error:", error);
    throw error;
  }
};