import React from "react";

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <section className="task-section empty">
        <p className="empty-msg">// NO TASKS LOGGED YET</p>
      </section>
    );
  }

  const pending   = tasks.filter(t => !t.done);
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
        <>
          <p className="completed-label">// Completed</p>
          <ul className="task-list">
            {completed.map(task => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </>
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
      <button className="task-delete" onClick={() => onDelete(task.id)}>✕</button>
    </li>
  );
}
