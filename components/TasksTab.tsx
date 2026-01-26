'use client';

import React, { useState } from 'react';
import { Task } from '@/app/page';

type TasksTabProps = {
  tasks: Task[];
  onAddTask: (title: string, priority: 'high' | 'medium' | 'low', dueDate: string) => void;
  onToggleTask: (id: string) => void;
};

export default function TasksTab({ tasks, onAddTask, onToggleTask }: TasksTabProps) {
  const [newTaskInput, setNewTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    onAddTask(newTaskInput.trim(), taskPriority, taskDueDate);
    setNewTaskInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未設定';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <>
      {/* Add Task Card */}
      <div className="card">
        <div className="card-title">
          <span>➕</span>
          タスクを追加
        </div>
        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="タスク内容を入力..."
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">優先度</label>
            <select
              className="form-input"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">期限</label>
            <input
              type="date"
              className="form-input"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddTask}>
          ➕ タスクを追加
        </button>
      </div>

      {/* Pending Tasks */}
      <div className="card">
        <div className="card-title">
          <span>📋</span>
          未完了タスク
          <span className="badge">{pendingTasks.length}</span>
        </div>
        <ul className="task-list">
          {pendingTasks.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              タスクはありません
            </li>
          ) : (
            pendingTasks.map((task) => (
              <li key={task.id} className="task-item">
                <div
                  className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => onToggleTask(task.id)}
                />
                <div className="task-content">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <span>📅 {formatDate(task.dueDate)}</span>
                    <span className={`task-priority priority-${task.priority}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>✅</span>
            完了済みタスク
            <span className="badge" style={{ background: 'var(--accent-success)' }}>
              {completedTasks.length}
            </span>
          </div>
          <ul className="task-list">
            {completedTasks.map((task) => (
              <li key={task.id} className="task-item" style={{ opacity: 0.6 }}>
                <div
                  className="task-checkbox checked"
                  onClick={() => onToggleTask(task.id)}
                />
                <div className="task-content">
                  <div className="task-title" style={{ textDecoration: 'line-through' }}>
                    {task.title}
                  </div>
                  <div className="task-meta">
                    <span>📅 {formatDate(task.dueDate)}</span>
                    <span className={`task-priority priority-${task.priority}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
