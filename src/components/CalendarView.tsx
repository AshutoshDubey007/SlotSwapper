import { useState } from 'react';
import { supabase, Event } from '../lib/supabase';
import { X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CalendarViewProps {
  events: Event[];
  onRefresh: () => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

export function CalendarView({ events, onRefresh, showCreateModal, setShowCreateModal }: CalendarViewProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('events').insert({
        user_id: user?.id,
        title,
        start_time: startTime,
        end_time: endTime,
        status: 'BUSY',
      });

      if (insertError) throw insertError;

      setTitle('');
      setStartTime('');
      setEndTime('');
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const toggleSwappable = async (event: Event) => {
    try {
      const newStatus = event.status === 'BUSY' ? 'SWAPPABLE' : 'BUSY';
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BUSY':
        return 'bg-gray-100 text-gray-800';
      case 'SWAPPABLE':
        return 'bg-green-100 text-green-800';
      case 'SWAP_PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Events</h2>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(event.start_time)} - {formatDateTime(event.end_time)}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                    {event.status.replace('_', ' ')}
                  </span>
                  {event.status !== 'SWAP_PENDING' && (
                    <button
                      onClick={() => toggleSwappable(event)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        event.status === 'SWAPPABLE'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {event.status === 'SWAPPABLE' ? 'Mark as Busy' : 'Make Swappable'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Team Meeting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
