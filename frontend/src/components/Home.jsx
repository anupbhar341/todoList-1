/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SummaryModal from "./SummaryModal";
import ProfileDropdown from "./ProfileDropdown";

function Home({ onLogoutSuccess }) {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState('all');

  const [editedTodoText, setEditedTodoText] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedPriority, setEditedPriority] = useState("Medium");
  const [editingTodoId, setEditingTodoId] = useState(null);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState('default');

  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');

  const navigate = useNavigate();

  const sentNotifications = useRef(new Set());

  const NOTIFY_OFFSETS = [
    { ms: 60 * 60 * 1000, label: '1 hour' },
    { ms: 10 * 60 * 1000, label: '10 minutes' },
    { ms: 5 * 60 * 1000, label: '5 minutes' },
    { ms: 1 * 60 * 1000, label: '1 minute' }
  ];

  // Move fetchTodos outside useEffect to prevent re-creation on every render
  const fetchTodos = async () => {
    try {
      if (!localStorage.getItem("token")) {
        navigate("/login", { replace: true });
        return;
      }
      setLoading(true);
      const response = await axios.get("http://localhost:4002/todo/fetch", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setTodos(response.data.todoList);
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos(); // Call fetchTodos here when component mounts

    // Request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    const reminderInterval = setInterval(() => {
      checkReminders();
    }, 60 * 1000); // Check every 1 minute

    return () => clearInterval(reminderInterval);
  }, [navigate, notificationPermission]); // Only re-run if navigate or notificationPermission changes

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(checkReminders, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, [todos]);

  const checkReminders = () => {
    if (Notification.permission !== 'granted') return;
    const now = Date.now();

    todos.forEach(todo => {
      if (!todo.isComplete && todo.dueDate) {
        const dueTime = new Date(todo.dueDate).getTime();

        NOTIFY_OFFSETS.forEach(({ ms, label }) => {
          const diff = dueTime - now;
          const key = `${todo._id}-${label}`;
          // Trigger notification if within 30s window and not already sent
          if (diff <= ms && diff > ms - 30000 && !sentNotifications.current.has(key)) {
            new Notification('Task Reminder', {
              body: `Your task "${todo.text}" is due in ${label}!`,
              tag: key
            });
            sentNotifications.current.add(key);
          }
        });
      }
    });
  };

  const createTodo = async (e) => {
    e.preventDefault();
    try {
      if (!newTodo || !newDueDate) return;
      const response = await axios.post(
        "http://localhost:4002/todo/create",
        {
          text: newTodo,
          description: newDescription,
          dueDate: newDueDate,
          priority: newPriority
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setTodos([...todos, response.data.newTodo]);
      setNewTodo("");
      setNewDescription("");
      setNewDueDate("");
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create Todo");
    }
  };

  const updateTodoStatus = async (id) => {
    try {
      const todo = todos.find((t) => t._id === id);
      if (todo) {
        const response = await axios.put(
          `http://localhost:4002/todo/update/${id}`,
          { ...todo, isComplete: !todo.isComplete },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setTodos(todos.map((t) => (t._id === id ? response.data.todo : t)));
        setError(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update todo status");
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`http://localhost:4002/todo/delete/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setTodos(todos.filter((t) => t._id !== id));
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete Todo");
    }
  };

  const logout = async () => {
    try {
      await axios.get(`http://localhost:4002/user/logout`);
      localStorage.removeItem("token");
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Logout failed");
    }
  };

  const updateTodoText = async (id) => {
    try {
      const todo = todos.find((t) => t._id === id);
      if (todo) {
        const response = await axios.put(
          `http://localhost:4002/todo/update/${id}`,
          { 
            ...todo, 
            text: editedTodoText, 
            description: editedDescription,
            dueDate: editedDueDate, 
            priority: editedPriority
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setTodos(todos.map((t) => (t._id === id ? response.data.todo : t)));
        setEditedTodoText("");
        setEditedDescription("");
        setEditedDueDate("");
        setEditingTodoId(null);
        setError(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update todo text");
    }
  };

  const priorityOrder = {
    'Low': 1,
    'Medium': 2,
    'High': 3
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'priority') {
      const priorityA = priorityOrder[a.priority] || 0;
      const priorityB = priorityOrder[b.priority] || 0;
      return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
    } else if (sortBy === 'completionStatus') {
      // Incomplete tasks first for asc, completed tasks first for desc
      if (sortOrder === 'asc') {
        if (a.isComplete && !b.isComplete) return 1;
        if (!a.isComplete && b.isComplete) return -1;
      } else {
        if (a.isComplete && !b.isComplete) return -1;
        if (!a.isComplete && b.isComplete) return 1;
      }
      return 0;
    }
    return 0;
  });

  const filteredAndSortedTodos = sortedTodos.filter(todo => {
    if (filter === 'active') return !todo.isComplete;
    if (filter === 'completed') return todo.isComplete;
    return true;
  });

  const remainingTodos = todos.filter((todo) => !todo.isComplete).length;

  // Group todos by category
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const groupedTodos = {
    today: filteredAndSortedTodos.filter(todo => {
      const todoDueDate = new Date(todo.dueDate);
      todoDueDate.setHours(0, 0, 0, 0);
      return !todo.isComplete && todoDueDate.getTime() === today.getTime();
    }),
    upcoming: filteredAndSortedTodos.filter(todo => {
      const todoDueDate = new Date(todo.dueDate);
      todoDueDate.setHours(0, 0, 0, 0);
      return !todo.isComplete && 
             todoDueDate.getTime() > today.getTime() && 
             todoDueDate.getTime() <= dayAfterTomorrow.getTime();
    }),
    completed: filteredAndSortedTodos.filter(todo => todo.isComplete)
  };

  const renderTodoList = (todoList) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-xl overflow-visible">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sm:w-16">Status</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Task</th>
            <th className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Description</th>
            <th className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Due Time</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Priority</th>
            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {todoList.map((todo, index) => (
            <tr
              key={todo._id || index}
              className="group relative transition-all duration-300 ease-in-out hover:bg-gray-50 hover:scale-[1.02] hover:shadow-lg hover:z-10 hover:rounded-xl overflow-visible"
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 bg-white"
                    checked={todo.isComplete}
                    onChange={() => updateTodoStatus(todo._id)}
                  />
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4">
                <div className="text-sm font-medium text-gray-900">
                  {editingTodoId === todo._id ? (
                    <input
                      type="text"
                      value={editedTodoText}
                      onChange={(e) => setEditedTodoText(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                    />
                  ) : (
                    <span className={`${todo.isComplete ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {todo.text}
                    </span>
                  )}
                </div>
              </td>
              <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4">
                <div className="text-sm text-gray-600">
                  {editingTodoId === todo._id ? (
                    <input
                      type="text"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                    />
                  ) : (
                    <span className={todo.isComplete ? 'line-through text-gray-400' : ''}>
                      {todo.description || '-'}
                    </span>
                  )}
                </div>
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">
                  {editingTodoId === todo._id ? (
                    <input
                      type="datetime-local"
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                    />
                  ) : (
                    <span className={todo.isComplete ? 'line-through text-gray-400' : ''}>
                      {todo.dueDate ? new Date(todo.dueDate).toLocaleString() : '-'}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-sm">
                  {editingTodoId === todo._id ? (
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${todo.priority === 'High' ? 'bg-red-100 text-red-800' : 
                        todo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}
                    >
                      {todo.priority}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                {editingTodoId === todo._id ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        updateTodoText(todo._id);
                        setEditingTodoId(null);
                      }}
                      className="text-green-600 hover:text-green-900 p-1 sm:p-2 rounded-lg hover:bg-green-50 transition-colors duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingTodoId(null)}
                      className="text-gray-600 hover:text-gray-900 p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingTodoId(todo._id);
                        setEditedTodoText(todo.text);
                        setEditedDescription(todo.description || '');
                        setEditedDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '');
                        setEditedPriority(todo.priority || 'Medium');
                      }}
                      className="text-blue-600 hover:text-blue-900 p-1 sm:p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm-6 6h6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTodo(todo._id)}
                      className="text-red-600 hover:text-red-900 p-1 sm:p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Todo List</h1>
          <div className="flex items-center space-x-4">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
              >
                Daily Summary
              </button>
              <Link to="/summary-history" className="w-full sm:w-auto">
                <button
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Summary History
                </button>
              </Link>
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            Error: {error}
          </div>
        )}

        {/* Add Todo Form */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <form onSubmit={createTodo}>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Add New Todo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-700">Task Name</label>
                <input
                  type="text"
                  id="text"
                  placeholder="Add a new todo"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  required
                  className="mt-1 block w-full p-2 sm:p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  id="description"
                  placeholder="Task description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows="3"
                  className="mt-1 block w-full p-2 sm:p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white text-gray-900"
                ></textarea>
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="mt-1 block w-full p-2 sm:p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  id="priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="mt-1 block w-full p-2 sm:p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white text-gray-900"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 sm:py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              Add Todo
            </button>
          </form>
        </div>

        {/* Todo Lists */}
        <div className="space-y-6 sm:space-y-8">
          {filteredAndSortedTodos.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white rounded-2xl shadow-lg">
              <p className="text-gray-600 text-base sm:text-lg">No todos found.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm mr-2 sm:mr-3">
                    {groupedTodos.today.length}
                  </span>
                  Today's Focus
                </h2>
                {renderTodoList(groupedTodos.today)}
              </div>
            </>
          )}

          {groupedTodos.upcoming.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <span className="bg-teal-100 text-teal-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm mr-2 sm:mr-3">
                  {groupedTodos.upcoming.length}
                </span>
                Upcoming
              </h2>
              {renderTodoList(groupedTodos.upcoming)}
            </div>
          )}

          {groupedTodos.completed.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <span className="bg-green-100 text-green-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm mr-2 sm:mr-3">
                  {groupedTodos.completed.length}
                </span>
                Completed
              </h2>
              {renderTodoList(groupedTodos.completed)}
            </div>
          )}
        </div>

        <SummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default Home;
