import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function SummaryHistory() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:4002/summary/history', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Sort summaries by date in descending order (newest first)
      const sortedSummaries = response.data.summaries.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      setSummaries(sortedSummaries);
    } catch (error) {
      setError('Failed to fetch summaries');
      console.error('Error fetching summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-800">Summary History</h1>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          >
            ✕
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-600">Loading summaries...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : summaries.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No summaries found.</p>
        ) : (
          <div className="space-y-6">
            {summaries.map((summary) => (
              <div key={summary._id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {formatDate(summary.date)}
                  </h2>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-line">{summary.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryHistory; 