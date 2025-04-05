'use client';

import { useState, useEffect } from 'react';
import { ClockIcon, MapPinIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ArrivalTab({ eventID, username, event }) {
  const [arrivalStatus, setArrivalStatus] = useState(null);
  const [arrivalTime, setArrivalTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [groupArrivalStats, setGroupArrivalStats] = useState({
    onTime: 0,
    early: 0,
    late: 0,
    notReported: 0
  });

  useEffect(() => {
    fetchArrivalStatus();
    fetchGroupArrivalStats();
  }, []);

  const fetchArrivalStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_arrival_status?eventID=${eventID}&username=${username}`);
      const data = await response.json();

      if (data.message === 'success') {
        setArrivalStatus(data.status);
        setArrivalTime(data.arrivalTime || '');
      }
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load arrival status');
      setIsLoading(false);
    }
  };

  const fetchGroupArrivalStats = async () => {
    try {
      const response = await fetch(`/api/get_group_arrival_stats?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success') {
        setGroupArrivalStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load group arrival stats');
    }
  };

  const handleSubmitArrivalStatus = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/update_arrival_status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          status: arrivalStatus,
          arrivalTime
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setMessage('Arrival status updated successfully');
        fetchGroupArrivalStats();
      } else {
        setError('Failed to update arrival status');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <ClockIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Arrival Status
      </h2>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Update Your Status</h3>
        <p className="text-sm text-gray-500 mb-4">
          Let everyone know if you'll be on time, early, or running late.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arrival Status
            </label>
            <div className="flex space-x-2">
              {['On Time', 'Early', 'Late'].map((status) => (
                <button
                  key={status}
                  onClick={() => setArrivalStatus(status)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition
                    ${arrivalStatus === status 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {status}
                  {arrivalStatus === status && (
                    <CheckIcon className="inline-block ml-2 h-4 w-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700 mb-2">
              Expected Arrival Time
            </label>
            <input
              type="time"
              id="arrivalTime"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
          </div>

          <button
            onClick={handleSubmitArrivalStatus}
            disabled={isSubmitting || !arrivalStatus}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Update Status'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Group Arrival Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { 
              label: 'On Time', 
              count: groupArrivalStats.onTime, 
              bgColor: 'bg-green-100', 
              textColor: 'text-green-700',
              icon: <CheckIcon className="h-5 w-5 text-green-500" />
            },
            { 
              label: 'Early', 
              count: groupArrivalStats.early, 
              bgColor: 'bg-blue-100', 
              textColor: 'text-blue-700',
              icon: <ClockIcon className="h-5 w-5 text-blue-500" />
            },
            { 
              label: 'Late', 
              count: groupArrivalStats.late, 
              bgColor: 'bg-red-100', 
              textColor: 'text-red-700',
              icon: <XMarkIcon className="h-5 w-5 text-red-500" />
            },
            { 
              label: 'Not Reported', 
              count: groupArrivalStats.notReported, 
              bgColor: 'bg-gray-100', 
              textColor: 'text-gray-700',
              icon: <ClockIcon className="h-5 w-5 text-gray-500" />
            }
          ].map(({ label, count, bgColor, textColor, icon }) => (
            <div 
              key={label} 
              className={`${bgColor} ${textColor} p-4 rounded-lg flex items-center justify-between`}
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              {icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}