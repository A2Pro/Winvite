'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function ScheduleTab({ eventID, username, event }) {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [allTimeSlots, setAllTimeSlots] = useState({});
  const [bestTimeSlots, setBestTimeSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [totalParticipants, setTotalParticipants] = useState(0);

  // Generate time slots for the event date
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    if (event && event.time) {
      // Generate time slots from 8 AM to 10 PM in 30 minute increments
      const slots = [];
      const date = new Date(event.time);
      
      for (let hour = 8; hour <= 22; hour++) {
        for (let minutes of [0, 30]) {
          if (hour === 22 && minutes === 30) continue; // Skip 10:30 PM
          
          const time = new Date(date);
          time.setHours(hour, minutes);
          
          slots.push({
            id: `${hour}:${minutes === 0 ? '00' : minutes}`,
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: time.toISOString(),
            selected: false
          });
        }
      }
      
      setTimeSlots(slots);
      fetchBestTimes();
    }
  }, [event]);

  const fetchBestTimes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_best_times?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success' || data.message === 'no_availability_data') {
        setBestTimeSlots(data.bestTimeSlots || []);
        setAllTimeSlots(data.allTimeSlots || {});
        setTotalParticipants(data.totalParticipants || 0);
        
        // Mark user's selected time slots
        if (data.times && data.times[username]) {
          const userTimes = data.times[username];
          setAvailableTimes(userTimes);
          
          setTimeSlots(prev => 
            prev.map(slot => ({
              ...slot,
              selected: userTimes.includes(slot.timestamp)
            }))
          );
        }
      } else {
        setError('Failed to load time data');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTimeSlot = (index) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index].selected = !updatedSlots[index].selected;
    setTimeSlots(updatedSlots);
    
    // Update available times array
    if (updatedSlots[index].selected) {
      setAvailableTimes(prev => [...prev, updatedSlots[index].timestamp]);
    } else {
      setAvailableTimes(prev => prev.filter(time => time !== updatedSlots[index].timestamp));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/update_times', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          availableTimes
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setBestTimeSlots(data.bestTimeSlots || []);
        setAllTimeSlots(data.allTimeSlots || {});
        setTotalParticipants(data.totalParticipants || 0);
        setMessage('Your availability has been updated');
      } else {
        setError('Failed to update your availability');
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
        <CalendarIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Event Schedule
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Your Availability</h3>
        <p className="text-sm text-gray-500 mb-4">
          Click on the time slots when you're available to attend this event.
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
          {timeSlots.map((slot, index) => (
            <button
              key={slot.id}
              onClick={() => toggleTimeSlot(index)}
              className={`
                p-2 rounded-md text-xs text-center transition
                ${slot.selected 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              {slot.time}
              {slot.selected && (
                <span className="block mt-1 text-indigo-700">
                  <CheckIcon className="h-3 w-3 mx-auto" />
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save My Availability'}
        </button>
      </div>

      {Object.keys(allTimeSlots).length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Group Availability</h3>
          <p className="text-sm text-gray-500 mb-4">
            {totalParticipants} {totalParticipants === 1 ? 'person has' : 'people have'} shared their availability.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Best times for everyone:
            </h4>
            {bestTimeSlots.length > 0 ? (
              <ul className="space-y-1">
                {bestTimeSlots.map((slot, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    <span className="text-gray-800 font-medium">
                      {new Date(slot).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="ml-2 text-gray-500">
                      ({allTimeSlots[slot]} of {totalParticipants} available)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No common time slots found yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}