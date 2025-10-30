import { useState, useEffect } from 'react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftRight, X } from 'lucide-react';

interface MarketplaceProps {
  onRefresh: () => void;
}

export function Marketplace({ onRefresh }: MarketplaceProps) {
  const { user } = useAuth();
  const [swappableSlots, setSwappableSlots] = useState<Event[]>([]);
  const [mySwappableSlots, setMySwappableSlots] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Event | null>(null);
  const [selectedMySlot, setSelectedMySlot] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const authHeader = `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swappable-slots`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load swappable slots');
      const result = await response.json();
      setSwappableSlots(result.data || []);

      const { data: mySlots } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'SWAPPABLE');

      setMySwappableSlots(mySlots || []);
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSwap = (slot: Event) => {
    if (mySwappableSlots.length === 0) {
      setError('You need at least one swappable slot to request a swap');
      return;
    }
    setSelectedSlot(slot);
    setShowSwapModal(true);
    setError('');
  };

  const submitSwapRequest = async () => {
    if (!selectedMySlot || !selectedSlot) return;

    setError('');
    try {
      const authHeader = `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swap-request`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mySlotId: selectedMySlot,
          theirSlotId: selectedSlot.id,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create swap request');
      }

      setShowSwapModal(false);
      setSelectedSlot(null);
      setSelectedMySlot('');
      loadSlots();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create swap request');
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Swaps</h2>

        {swappableSlots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No swappable slots available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {swappableSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{slot.title}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {formatDateTime(slot.start_time)}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {formatDateTime(slot.end_time)}
                </p>
                <button
                  onClick={() => handleRequestSwap(slot)}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Request Swap</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSwapModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Request Swap</h3>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">You want to swap:</p>
              <p className="font-semibold text-gray-900">{selectedSlot.title}</p>
              <p className="text-sm text-gray-600">{formatDateTime(selectedSlot.start_time)}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select one of your swappable slots:
              </label>
              <select
                value={selectedMySlot}
                onChange={(e) => setSelectedMySlot(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Choose a slot...</option>
                {mySwappableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.title} - {formatDateTime(slot.start_time)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={submitSwapRequest}
              disabled={!selectedMySlot}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Swap Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
