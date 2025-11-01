import { useState, useEffect } from 'react';
import { supabase, SwapRequest, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Clock, AlertCircle } from 'lucide-react';

interface NotificationsProps {
  onRefresh: () => void;
}

interface SwapRequestWithEvents extends SwapRequest {
  requester_slot: Event | null;
  owner_slot: Event | null;
}

export function Notifications({ onRefresh }: NotificationsProps) {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequestWithEvents[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequestWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setError(null);
      const { data: incoming, error: incomingError } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      const { data: outgoing, error: outgoingError } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      if (incoming) {
        const incomingWithEvents = await Promise.all(
          incoming.map(async (req) => {
            try {
              const [requesterSlot, ownerSlot] = await Promise.all([
                supabase.from('events').select('*').eq('id', req.requester_slot_id).maybeSingle(),
                supabase.from('events').select('*').eq('id', req.owner_slot_id).maybeSingle(),
              ]);
              return {
                ...req,
                requester_slot: requesterSlot.data || null,
                owner_slot: ownerSlot.data || null,
              };
            } catch (e) {
              console.error('Error loading event:', e);
              return {
                ...req,
                requester_slot: null,
                owner_slot: null,
              };
            }
          })
        );
        setIncomingRequests(incomingWithEvents.filter(r => r.requester_slot && r.owner_slot));
      }

      if (outgoing) {
        const outgoingWithEvents = await Promise.all(
          outgoing.map(async (req) => {
            try {
              const [requesterSlot, ownerSlot] = await Promise.all([
                supabase.from('events').select('*').eq('id', req.requester_slot_id).maybeSingle(),
                supabase.from('events').select('*').eq('id', req.owner_slot_id).maybeSingle(),
              ]);
              return {
                ...req,
                requester_slot: requesterSlot.data || null,
                owner_slot: ownerSlot.data || null,
              };
            } catch (e) {
              console.error('Error loading event:', e);
              return {
                ...req,
                requester_slot: null,
                owner_slot: null,
              };
            }
          })
        );
        setOutgoingRequests(outgoingWithEvents.filter(r => r.requester_slot && r.owner_slot));
      }
    } catch (err: any) {
      console.error('Error loading requests:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, accept: boolean) => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No session token');
      }

      const authHeader = `Bearer ${session.data.session.access_token}`;
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
        const text = await response.text();
        let errorMsg = 'Failed to respond to swap request';
        try {
          const result = JSON.parse(text);
          errorMsg = result.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Swap response successful:', result);

      await new Promise(resolve => setTimeout(resolve, 800));
      await loadRequests();
      onRefresh();
    } catch (err: any) {
      console.error('Error responding to swap:', err);
      setError(err.message || 'Failed to respond to swap request');
    } finally {
      setLoading(false);
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

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
                        <p className="font-medium text-gray-900">{request.owner_slot?.title || 'Deleted event'}</p>
                        {request.owner_slot && (
                          <p className="text-sm text-gray-600">{formatDateTime(request.owner_slot.start_time)}</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">They offer:</p>
                        <p className="font-medium text-gray-900">{request.requester_slot?.title || 'Deleted event'}</p>
                        {request.requester_slot && (
                          <p className="text-sm text-gray-600">{formatDateTime(request.requester_slot.start_time)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleResponse(request.id, true)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    <span>{loading ? 'Processing...' : 'Accept'}</span>
                  </button>
                  <button
                    onClick={() => handleResponse(request.id, false)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    <span>{loading ? 'Processing...' : 'Reject'}</span>
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
                        <p className="font-medium text-gray-900">{request.requester_slot?.title || 'Deleted event'}</p>
                        {request.requester_slot && (
                          <p className="text-sm text-gray-600">{formatDateTime(request.requester_slot.start_time)}</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">For:</p>
                        <p className="font-medium text-gray-900">{request.owner_slot?.title || 'Deleted event'}</p>
                        {request.owner_slot && (
                          <p className="text-sm text-gray-600">{formatDateTime(request.owner_slot.start_time)}</p>
                        )}
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
