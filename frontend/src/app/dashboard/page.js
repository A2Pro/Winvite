'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  SparklesIcon, 
  MapPinIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [hostingEvents, setHostingEvents] = useState([]);
  const [memberEvents, setMemberEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventIdInput, setEventIdInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Random event generator state
  const [showEventFinder, setShowEventFinder] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [location, setLocation] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [suggestedEvent, setSuggestedEvent] = useState(null);
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/login');
      return;
    }
    
    setUsername(storedUsername);
    fetchEvents(storedUsername);
  }, [router]);

  const fetchEvents = async (username) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_events?username=${username}`);
      const data = await response.json();

      if (data.message === 'success') {
        setHostingEvents(data.hosting || []);
        setMemberEvents(data.member || []);
      } else {
        setError('Failed to load events');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    setJoinError('');
    if (!eventIdInput) {
      setJoinError('Please enter an event ID');
      return;
    }

    try {
      const response = await fetch('/api/join_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, eventID: eventIdInput }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        router.push(`/event/${eventIdInput}`);
      } else if (data.message === 'invalid_id') {
        setJoinError('Invalid event ID');
      } else if (data.message === 'already_joined') {
        router.push(`/event/${eventIdInput}`);
      } else {
        setJoinError('Failed to join event');
      }
    } catch (err) {
      setJoinError('Something went wrong. Please try again.');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    router.push('/login');
  };

  // Random event generator functions
  const detectLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Get location from browser geolocation API
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Simple reverse geocoding using a free API
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || '';
              const state = data.address.state || '';
              const country = data.address.country || '';
              setLocation([city, state, country].filter(Boolean).join(', '));
            }
          } catch (err) {
            console.error('Error with reverse geocoding:', err);
            setLocation('');
          }
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
        }
      );
    } catch (err) {
      console.error('Failed to detect location:', err);
      setIsLoadingLocation(false);
    }
  };

  const generateRandomEvent = async () => {
    if (!location || !selectedTime) {
      setError('Please select both a time and location');
      return;
    }
    
    setIsGeneratingEvent(true);
    
    try {
      // Call your backend API that will use GPT
      const response = await fetch('/api/generate_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          time: selectedTime,
          username
        }),
      });
      
      const data = await response.json();
      if (data.message === 'success') {
        setSuggestedEvent(data.event);
      } else {
        setError('Failed to generate event suggestion');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsGeneratingEvent(false);
    }
  };

  const createEventFromSuggestion = () => {
    if (!suggestedEvent) return;
    
    // Store suggested event in localStorage to pre-fill the create event form
    localStorage.setItem('suggestedEvent', JSON.stringify(suggestedEvent));
    router.push('/create-event');
  };

  const EventCard = ({ event, isHost }) => (
    <Link 
      href={`/event/${event.eventID}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
    >
      <div className="flex justify-between items-start">
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isHost ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isHost ? 'Hosting' : 'Attending'}
          </span>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Event #{event.eventID}</h3>
          <p className="mt-1 text-gray-900">
            {event.location || 'No location set'}
          </p>
        </div>
        <div className="flex items-center text-sm text-gray-900">
          <CalendarIcon className="mr-1 h-4 w-4" />
          {event.time || 'No time set'}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center text-sm text-gray-900">
          <UserGroupIcon className="mr-2 h-4 w-4" />
          {isHost ? (
            <span>{event.members?.length || 0} attendees</span>
          ) : (
            <span>Hosted by {event.host}</span>
          )}
        </div>
      </div>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Discovery Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Discover Events</h2>
              <p className="text-sm text-gray-500">Find something fun to do near you</p>
            </div>
            <button
              onClick={() => setShowEventFinder(!showEventFinder)}
              className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
              {showEventFinder ? 'Hide Event Finder' : 'Find Random Event'}
            </button>
          </div>
          
          {showEventFinder && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700 mb-1">
                    When are you free?
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="eventTime"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    >
                      <option value="">Select a time</option>
                      <option value="morning">Morning (8am-12pm)</option>
                      <option value="afternoon">Afternoon (12pm-5pm)</option>
                      <option value="evening">Evening (5pm-9pm)</option>
                      <option value="night">Night (9pm-late)</option>
                      <option value="weekend">This Weekend</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Where are you?
                  </label>
                  <div className="flex">
                    <div className="relative flex-grow rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter your location"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-l-md text-black"
                      />
                    </div>
                    <button
                      onClick={detectLocation}
                      disabled={isLoadingLocation}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-sm text-gray-700 rounded-r-md hover:bg-gray-100"
                    >
                      {isLoadingLocation ? 'Detecting...' : 'Detect'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={generateRandomEvent}
                  disabled={isGeneratingEvent || !location || !selectedTime}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                  {isGeneratingEvent ? 'Finding Ideas...' : 'Suggest Random Event'}
                </button>
              </div>
              
              {suggestedEvent && (
                <div className="mt-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                  <h3 className="text-lg font-medium text-indigo-800 mb-2">{suggestedEvent.title}</h3>
                  <p className="text-sm text-indigo-700 mb-3">{suggestedEvent.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <ClockIcon className="mr-1 h-3 w-3" />{suggestedEvent.time}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <MapPinIcon className="mr-1 h-3 w-3" />{suggestedEvent.location}
                    </span>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => setSuggestedEvent(null)}
                      className="text-sm text-indigo-700 hover:text-indigo-900"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={createEventFromSuggestion}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create This Event
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Events</h2>
            <p className="text-sm text-gray-500">Manage the events you're hosting or attending</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex">
              <input
                type="text"
                placeholder="Enter Event ID"
                value={eventIdInput}
                onChange={(e) => setEventIdInput(e.target.value)}
                className="min-w-0 flex-1 rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
              />
              <button
                onClick={handleJoinEvent}
                className="rounded-r-md border border-l-0 border-gray-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Join
              </button>
            </div>
            <Link
              href="/create-event"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Create Event
            </Link>
          </div>
        </div>

        {joinError && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {joinError}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {hostingEvents.length === 0 && memberEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-500 mb-4">
              Create a new event or join an existing one using an event ID
            </p>
            <Link
              href="/create-event"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Create Your First Event
            </Link>
          </div>
        ) : (
          <>
            {hostingEvents.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Events You're Hosting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hostingEvents.map((event) => (
                    <EventCard key={event.eventID} event={event} isHost={true} />
                  ))}
                </div>
              </div>
            )}

            {memberEvents.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Events You're Attending</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memberEvents.map((event) => (
                    <EventCard key={event.eventID} event={event} isHost={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}