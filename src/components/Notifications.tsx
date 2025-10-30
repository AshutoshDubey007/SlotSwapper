import { useState, useEffect } from 'react';
import { supabase, SwapRequest, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Clock } from 'lucide-react';

interface NotificationsProps {
  onRefresh: () => void;
}

interface SwapRequestWithEvents extends SwapRequest {
  requester_slot: Event;
  owner_slot: Event;
}

export function Notifications({ onRefresh }: NotificationsProps) {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequestWithEvents[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequestWithEvents[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data: incoming } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      const { data: outgoing } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (incoming) {
        const incomingWithEvents = await Promise.all(
          incoming.map(async (req) => {
            const [requesterSlot, ownerSlot] = await Promise.all([
              supabase.from('events').select('*').eq('id', req.requester_slot_id).single(),
              supabase.from('events').select('*').eq('id', req.owner_slot_id).single(),
            ]);
            return {
              ...req,
              requester_slot: requesterSlot.data!,
              owner_slot: ownerSlot.data!,
            };
          })
        );
        setIncomingRequests(incomingWithEvents);
      }

      if (outgoing) {
        const outgoingWithEvents = await Promise.all(
          outgoing.map(async (req) => {
            const [requesterSlot, ownerSlot] = await Promise.all([
              supabase.from('events').select('*').eq('id', req.requester_slot_id).single(),
              supabase.from('events').select('*').eq('id', req.owner_slot_id).single(),
            ]);
            return {
              ...req,
              requester_slot: requesterSlot.data!,
              owner_slot: ownerSlot.data!,
            };
          })
        );
        setOutgoingRequests(outgoingWithEvents);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, accept: boolean) => {
    try {
      const authHeader = `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swap-response`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, accept }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to respond to swap request');
      }

      loadRequests();
      onRefresh();
    } catch (err) {
      console.error('Error responding to swap:', err);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Pending</span>;
      case 'ACCEPTED':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Accepted</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Incoming Requests</h2>
        {incomingRequests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending incoming requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Swap Request</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">They want your:</p>
                        <p className="font-medium text-gray-900">{request.owner_slot.title}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(request.owner_slot.start_time)}</p>
                      </div>
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">They offer:</p>
                        <p className="font-medium text-gray-900">{request.requester_slot.title}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(request.requester_slot.start_time)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleResponse(request.id, true)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleResponse(request.id, false)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Outgoing Requests</h2>
        {outgoingRequests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No outgoing requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {outgoingRequests.map((request) => (
              <div
                key={request.id}
                className="p-5 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Your Swap Request</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">You offered:</p>
                        <p className="font-medium text-gray-900">{request.requester_slot.title}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(request.requester_slot.start_time)}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">For:</p>
                        <p className="font-medium text-gray-900">{request.owner_slot.title}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(request.owner_slot.start_time)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
