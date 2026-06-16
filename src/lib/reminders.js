// reminders.js — Smart reminders for tasks with and without times

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Parse time from task text like "Meeting with Rahul — 2pm"
function parseTaskTime(text) {
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|o'clock)?\b/i;
  const match = text.match(timeRegex);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3]?.toLowerCase().replace(/\./g, "");

  if (period?.includes("pm") && hours !== 12) hours += 12;
  if (period?.includes("am") && hours === 12) hours = 0;
  if (!period && hours < 7) hours += 12;

  const now = new Date();
  const taskTime = new Date(now);
  taskTime.setHours(hours, minutes, 0, 0);

  return taskTime;
}

function sendNotification(title, body, tag) {
  if (Notification.permission !== "granted") return;
  const notification = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag,
    requireInteraction: true,
  });
  notification.onclick = () => { window.focus(); notification.close(); };
}

// Schedule reminder for task WITH a specific time — 15 min before
function scheduleTimedReminder(task) {
  const taskTime = parseTaskTime(task.text);
  if (!taskTime) return [];

  const now = new Date();
  const reminderTime = new Date(taskTime.getTime() - 15 * 60 * 1000);
  const msUntilReminder = reminderTime.getTime() - now.getTime();

  if (msUntilReminder <= 0) return [];

  const id = setTimeout(() => {
    sendNotification(
      "⏰ Starting in 15 minutes",
      task.text,
      `timed_${task.id}`
    );
  }, msUntilReminder);

  console.log(`⏰ Timed reminder for "${task.text}" in ${Math.round(msUntilReminder / 60000)} min`);
  return [id];
}

// Schedule daily reminders at 1pm and 8pm for tasks WITHOUT a time
function scheduleDailyReminders(task) {
  const now = new Date();
  const ids = [];

  const reminderTimes = [
    { hour: 13, minute: 0, label: "afternoon" },  // 1pm
    { hour: 20, minute: 0, label: "evening" },    // 8pm
  ];

  reminderTimes.forEach(({ hour, minute, label }) => {
    const reminderTime = new Date(now);
    reminderTime.setHours(hour, minute, 0, 0);

    let msUntil = reminderTime.getTime() - now.getTime();

    // If time already passed today, schedule for tomorrow
    if (msUntil <= 0) {
      reminderTime.setDate(reminderTime.getDate() + 1);
      msUntil = reminderTime.getTime() - now.getTime();
    }

    const id = setTimeout(() => {
      sendNotification(
        `📋 ${label === "afternoon" ? "Afternoon" : "Evening"} Task Reminder`,
        task.text,
        `daily_${label}_${task.id}`
      );
    }, msUntil);

    console.log(`📋 Daily ${label} reminder for "${task.text}" in ${Math.round(msUntil / 60000)} min`);
    ids.push(id);
  });

  return ids;
}

// Main function — decides which reminder type to use
export function scheduleReminder(task) {
  if (!task.text || task.done) return [];

  const hasTime = parseTaskTime(task.text) !== null;

  if (hasTime) {
    return scheduleTimedReminder(task);
  } else {
    return scheduleDailyReminders(task);
  }
}

// Schedule reminders for all tasks
export function scheduleAllReminders(tasks) {
  const reminderIds = {};
  tasks.forEach(task => {
    if (!task.done) {
      const ids = scheduleReminder(task);
      if (ids.length > 0) reminderIds[task.id] = ids;
    }
  });
  return reminderIds;
}

// Cancel reminders for a specific task
export function cancelReminder(taskId, reminderIds) {
  if (reminderIds[taskId]) {
    reminderIds[taskId].forEach(id => clearTimeout(id));
    delete reminderIds[taskId];
  }
}

// Cancel all reminders
export function cancelAllReminders(reminderIds) {
  Object.values(reminderIds).forEach(ids =>
    ids.forEach(id => clearTimeout(id))
  );
}
