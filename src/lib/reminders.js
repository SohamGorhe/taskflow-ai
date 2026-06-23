// reminders.js — Smart reminders with alarm beeps

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Play 4 short beeps using Web Audio API
function playAlarmBeeps() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beepCount = 4;
    const beepDuration = 0.18; // seconds
    const beepGap = 0.12;      // seconds between beeps

    for (let i = 0; i < beepCount; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = 880; // A5 — sharp, attention-grabbing

      const start = ctx.currentTime + i * (beepDuration + beepGap);
      const end = start + beepDuration;

      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.8, start + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, end);

      oscillator.start(start);
      oscillator.stop(end);
    }
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}

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

function fireAlarm(title, body, tag) {
  playAlarmBeeps();
  sendNotification(title, body, tag);
}

function scheduleTimedReminder(task) {
  const taskTime = parseTaskTime(task.text);
  if (!taskTime) return [];

  const now = new Date();
  const reminderTime = new Date(taskTime.getTime() - 15 * 60 * 1000);
  const msUntilReminder = reminderTime.getTime() - now.getTime();
  if (msUntilReminder <= 0) return [];

  const ids = [];

  // First alarm
  const id1 = setTimeout(() => {
    fireAlarm("⏰ Starting in 15 minutes", task.text, `timed_${task.id}`);

    // Repeat once after 5 minutes if not dismissed
    const id2 = setTimeout(() => {
      fireAlarm("⏰ Reminder again — Starting soon!", task.text, `timed_repeat_${task.id}`);
    }, 5 * 60 * 1000);
    ids.push(id2);
  }, msUntilReminder);

  ids.push(id1);
  console.log(`⏰ Timed reminder for "${task.text}" in ${Math.round(msUntilReminder / 60000)} min`);
  return ids;
}

function scheduleDailyReminders(task) {
  const now = new Date();
  const ids = [];

  const reminderTimes = [
    { hour: 13, minute: 0, label: "afternoon" },
    { hour: 20, minute: 0, label: "evening" },
  ];

  reminderTimes.forEach(({ hour, minute, label }) => {
    const reminderTime = new Date(now);
    reminderTime.setHours(hour, minute, 0, 0);
    let msUntil = reminderTime.getTime() - now.getTime();
    if (msUntil <= 0) {
      reminderTime.setDate(reminderTime.getDate() + 1);
      msUntil = reminderTime.getTime() - now.getTime();
    }

    const id1 = setTimeout(() => {
      fireAlarm(
        `📋 ${label === "afternoon" ? "Afternoon" : "Evening"} Task Reminder`,
        task.text,
        `daily_${label}_${task.id}`
      );

      // Repeat once after 5 minutes
      const id2 = setTimeout(() => {
        fireAlarm(
          `📋 Don't forget — ${label === "afternoon" ? "Afternoon" : "Evening"} Reminder`,
          task.text,
          `daily_${label}_repeat_${task.id}`
        );
      }, 5 * 60 * 1000);
      ids.push(id2);
    }, msUntil);

    ids.push(id1);
    console.log(`📋 Daily ${label} reminder for "${task.text}" in ${Math.round(msUntil / 60000)} min`);
  });

  return ids;
}

export function scheduleReminder(task) {
  if (!task.text || task.done) return [];
  const hasTime = parseTaskTime(task.text) !== null;
  return hasTime ? scheduleTimedReminder(task) : scheduleDailyReminders(task);
}

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

export function cancelReminder(taskId, reminderIds) {
  if (reminderIds[taskId]) {
    reminderIds[taskId].forEach(id => clearTimeout(id));
    delete reminderIds[taskId];
  }
}

export function cancelAllReminders(reminderIds) {
  Object.values(reminderIds).forEach(ids => ids.forEach(id => clearTimeout(id)));
}
