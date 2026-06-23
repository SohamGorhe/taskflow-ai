import React from "react";

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
  if (taskTime < now) taskTime.setDate(taskTime.getDate() + 1);
  return taskTime;
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function addToCalendar(task) {
  const now = new Date();
  const taskTime = parseTaskTime(task.text);

  // Event start — use task time or next 1pm if no time
  const eventStart = taskTime || (() => {
    const d = new Date(now);
    d.setHours(13, 0, 0, 0);
    if (d < now) d.setDate(d.getDate() + 1);
    return d;
  })();

  const eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000); // 30 min duration
  const alarmTime = -15; // 15 min before

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskFlow AI//EN",
    "BEGIN:VEVENT",
    `UID:${task.id}@taskflow-ai`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(eventStart)}`,
    `DTEND:${formatICSDate(eventEnd)}`,
    `SUMMARY:${task.text}`,
    `DESCRIPTION:TaskFlow AI reminder for: ${task.text}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:AUDIO",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${task.text.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <section className="task-section empty">
        <p className="empty-msg">NO TASKS LOGGED YET</p>
      </section>
    );
  }

  const pending = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);

  return (
    <section className="task-section">
      <div className="task-header">
        <h2 className="task-title">Task Queue</h2>
        <span className="task-count">{pending.length} pending</span>
      </div>
      <ul className="task-list">
        {pending.map(task => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </ul>
      {completed.length > 0 && (
        <div>
          <p className="completed-label">Completed</p>
          <ul className="task-list">
            {completed.map(task => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li className={`task-item ${task.done ? "done" : ""}`}>
      <button className="task-check" onClick={() => onToggle(task.id)}>
        {task.done ? "✓" : ""}
      </button>
      <div className="task-body">
        <p className="task-text">{task.text}</p>
        {task.category && <span className="task-category">{task.category}</span>}
      </div>
      <span className={`task-priority priority-${task.priority}`}>{task.priority}</span>
      <button
        className="task-calendar"
        onClick={() => addToCalendar(task)}
        title="Add to Calendar"
        aria-label="Add to Calendar"
      >
        📅
      </button>
      <button className="task-delete" onClick={() => onDelete(task.id)}>✕</button>
    </li>
  );
}
