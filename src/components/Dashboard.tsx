import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Event } from '../lib/supabase';
import { Calendar, Plus, LogOut, Clock, Users, Bell } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { Marketplace } from './Marketplace';
import { Notifications } from './Notifications';

type View = 'calendar' | 'marketplace' | 'notifications';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>('calendar');
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">SlotSwapper</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
              view === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>My Calendar</span>
          </button>
          <button
            onClick={() => setView('marketplace')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
              view === 'marketplace'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => setView('notifications')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
              view === 'notifications'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>Requests</span>
          </button>
        </div>

        {view === 'calendar' && (
          <CalendarView
            events={events}
            onRefresh={loadEvents}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
          />
        )}
        {view === 'marketplace' && <Marketplace onRefresh={loadEvents} />}
        {view === 'notifications' && <Notifications onRefresh={loadEvents} />}
      </div>

      {view === 'calendar' && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
