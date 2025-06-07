/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SummaryModal from "./SummaryModal";

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

  const checkReminders = () => {
    if (notificationPermission === 'granted') {
      const now = new Date().getTime();
      todos.forEach(todo => {
        if (!todo.isComplete && todo.dueDate) {
          const dueDate = new Date(todo.dueDate).getTime();
          const timeDifference = dueDate - now;

          // Notify if task is due in the next 15 minutes (900,000 ms) and not past due
          if (timeDifference > 0 && timeDifference <= 15 * 60 * 1000) {
            new Notification('Task Reminder', {
              body: `Your task: "${todo.text}" is due soon!`,
              icon: '/path/to/your/icon.png' // Optional: Add a path to an icon
            });
          }
        }
      });
    }
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
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Task</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Due Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {todoList.map((todo, index) => (
            <tr key={todo._id || index} className="group relative hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={todo.isComplete}
                    onChange={() => updateTodoStatus(todo._id)}
                  />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {editingTodoId === todo._id ? (
                    <input
                      type="text"
                      value={editedTodoText}
                      onChange={(e) => setEditedTodoText(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <span className={todo.isComplete ? 'line-through text-gray-500' : ''}>
                      {todo.text}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="text-sm text-gray-500">
                  {editingTodoId === todo._id ? (
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      rows="2"
                    />
                  ) : (
                    <span className="line-clamp-2">{todo.description || '-'}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {editingTodoId === todo._id ? (
                    <input
                      type="datetime-local"
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  ) : (
                    todo.dueDate ? new Date(todo.dueDate).toLocaleTimeString() : '-'
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {editingTodoId === todo._id ? (
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block text-center min-w-[80px]
                      ${todo.priority === 'High' ? 'bg-red-100 text-red-800' : 
                        todo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {todo.priority}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium space-x-2">
                  {editingTodoId === todo._id ? (
                    <>
                      <button
                        onClick={() => updateTodoText(todo._id)}
                        className="text-green-600 hover:text-green-900 px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTodoId(null)}
                        className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingTodoId(todo._id);
                          setEditedTodoText(todo.text);
                          setEditedDescription(todo.description || '');
                          setEditedDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '');
                          setEditedPriority(todo.priority || 'Medium');
                        }}
                        className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm-6 6h6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteTodo(todo._id)}
                        className="text-red-600 hover:text-red-900 px-2 py-1 rounded"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </td>
              {/* Floating box on hover */}
              <div className="hidden group-hover:block fixed inset-0 z-50 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-[420px] border border-gray-200 pointer-events-auto transition-all duration-300 ease-out opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">{todo.text}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium
                          ${todo.priority === 'High' ? 'bg-red-100 text-red-800' : 
                            todo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {todo.priority}
                        </span>
                      </div>
                      {todo.description && (
                        <p className="text-gray-600 text-base">{todo.description}</p>
                      )}
                      {todo.dueDate && (
                        <div className="flex items-center text-base text-gray-500">
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Due: {new Date(todo.dueDate).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-center text-base text-gray-500">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status: {todo.isComplete ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Todo List</h1>
        <div>
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mr-2"
          >
            Daily Summary
          </button>
          <Link to="/summary-history">
            <button
              className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 mr-2"
            >
              Summary History
            </button>
          </Link>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      <form onSubmit={createTodo} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New Todo</h2>
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
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
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
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            ></textarea>
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
            <input
              type="datetime-local"
              id="dueDate"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            />
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              id="priority"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Todo
        </button>
      </form>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        {/* Filter buttons */}
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-md ${filter === 'active' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md ${filter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Completed
        </button>

        {/* Sort by dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="ml-auto px-4 py-2 rounded-md bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="dueDate">Sort by Due Date</option>
          <option value="priority">Sort by Priority</option>
          <option value="completionStatus">Sort by Completion Status</option>
        </select>

        {/* Sort order toggle button */}
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>

      <div className="space-y-4">
        {filteredAndSortedTodos.length === 0 ? (
          <p className="text-gray-600">No todos found.</p>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Focus ({groupedTodos.today.length})</h2>
            {renderTodoList(groupedTodos.today)}
          </>
        )}

        {groupedTodos.upcoming.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Upcoming ({groupedTodos.upcoming.length})</h2>
            {renderTodoList(groupedTodos.upcoming)}
          </div>
        )}

        {groupedTodos.completed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Completed ({groupedTodos.completed.length})</h2>
            {renderTodoList(groupedTodos.completed)}
          </div>
        )}
      </div>

      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </div>
  );
}

export default Home;
