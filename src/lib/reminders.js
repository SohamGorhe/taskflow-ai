// reminders.js — Browser notification reminders for tasks with times

// Request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Parse time from task text like "Meeting with Rahul — 2pm", "Call at 10:30am"
function parseTaskTime(text) {
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|o'clock)?\b/i;
  const match = text.match(timeRegex);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3]?.toLowerCase().replace(/\./g, "");

  if (period?.includes("pm") && hours !== 12) hours += 12;
  if (period?.includes("am") && hours === 12) hours = 0;

  // If no am/pm, assume business hours (if hour < 7, it's pm)
  if (!period && hours < 7) hours += 12;

  const now = new Date();
  const taskTime = new Date(now);
  taskTime.setHours(hours, minutes, 0, 0);

  return taskTime;
}

// Schedule a reminder 15 minutes before task time
export function scheduleReminder(task) {
  if (!task.text || task.done) return null;

  const taskTime = parseTaskTime(task.text);
  if (!taskTime) return null;

  const now = new Date();
  const reminderTime = new Date(taskTime.getTime() - 15 * 60 * 1000); // 15 min before
  const msUntilReminder = reminderTime.getTime() - now.getTime();

  // Only schedule if reminder is in the future
  if (msUntilReminder <= 0) return null;

  const timeoutId = setTimeout(() => {
    if (Notification.permission === "granted") {
      const notification = new Notification("⏰ TaskFlow Reminder", {
        body: `Starting in 15 minutes: ${task.text}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: task.id, // prevents duplicate notifications
        requireInteraction: true, // stays until user dismisses
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, msUntilReminder);

  console.log(`⏰ Reminder scheduled for "${task.text}" in ${Math.round(msUntilReminder / 60000)} minutes`);
  return timeoutId;
}

// Schedule reminders for all tasks
export function scheduleAllReminders(tasks) {
  const timeoutIds = {};
  tasks.forEach(task => {
    if (!task.done) {
      const id = scheduleReminder(task);
      if (id) timeoutIds[task.id] = id;
    }
  });
  return timeoutIds;
}

// Cancel a specific reminder
export function cancelReminder(taskId, timeoutIds) {
  if (timeoutIds[taskId]) {
    clearTimeout(timeoutIds[taskId]);
    delete timeoutIds[taskId];
  }
}

// Cancel all reminders
export function cancelAllReminders(timeoutIds) {
  Object.values(timeoutIds).forEach(id => clearTimeout(id));
}
