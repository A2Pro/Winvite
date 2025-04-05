'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChatBubbleLeftRightIcon, 
  CalendarIcon, 
  PhotoIcon, 
  MapPinIcon,
  UserGroupIcon,
  ShareIcon,
  TruckIcon,
  BanknotesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Tab components
import EventInfoTab from './EventInfoTab';
import ScheduleTab from './ScheduleTab';
import PicturesTab from './PicturesTab';
import PostsTab from './PostsTab';
import LocationsTab from './LocationsTab';
import RidesTab from './RidesTab';
import PaymentsTab from './PaymentsTab';
import ArrivalTab from './ArrivalTab';

export default function EventPage() {
  const router = useRouter();
  const params = useParams();
  const eventID = params.id;
  
  const [username, setUsername] = useState('');
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/login');
      return;
    }
    
    setUsername(storedUsername);
    fetchEventDetails();
  }, [router, eventID]);

  const fetchEventDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_event?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success') {
        setEvent(data.event);
      } else if (data.message === 'invalid_id') {
        setError('Event not found');
      } else {
        setError('Failed to load event details');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setShareMessage('Event link copied to clipboard');
        setTimeout(() => setShareMessage(''), 3000);
      })
      .catch(() => {
        setShareMessage('Failed to copy link');
        setTimeout(() => setShareMessage(''), 3000);
      });
  };

  const TabItem = ({ id, label, icon, current }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        group flex items-center px-3 py-2 text-sm font-medium rounded-md 
        ${current 
          ? 'bg-indigo-100 text-indigo-700' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  const renderTabContent = () => {
    if (!event) return null;
  
    switch(activeTab) {
      case 'info':
        return <EventInfoTab event={event} username={username} />;
      case 'schedule':
        return <ScheduleTab eventID={eventID} username={username} event={event} />;
      case 'pictures':
        return <PicturesTab eventID={eventID} username={username} />;
      case 'posts':
        return <PostsTab eventID={eventID} username={username} />;
      case 'locations':
        return <LocationsTab eventID={eventID} username={username} event={event} />;
      case 'rides':
        return <RidesTab eventID={eventID} username={username} event={event} />;
      case 'payments':
        return <PaymentsTab eventID={eventID} username={username} event={event} />;
      case 'arrival':
        return <ArrivalTab eventID={eventID} username={username} event={event} />;
      default:
        return <EventInfoTab event={event} username={username} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white shadow rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const isHost = event.host === username;
  const isMember = event.members?.includes(username);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 mr-2">
                Event #{event.eventID}
              </h1>
              {isHost && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Hosting
                </span>
              )}
              {isMember && !isHost && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Attending
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {isHost ? 'You are hosting this event' : `Hosted by ${event.host}`}
            </p>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleShare}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShareIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              Share
            </button>
            <Link
              href="/dashboard"
              className="ml-3 text-sm text-indigo-600 hover:text-indigo-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {shareMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md shadow-md">
          {shareMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-64 lg:flex-shrink-0">
            <div className="h-full py-6 pr-6">
              <nav className="space-y-1 bg-white p-3 rounded-lg shadow">
                <TabItem 
                  id="info" 
                  label="Event Info" 
                  current={activeTab === 'info'}
                  icon={<UserGroupIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="schedule" 
                  label="Schedule" 
                  current={activeTab === 'schedule'}
                  icon={<CalendarIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="pictures" 
                  label="Pictures" 
                  current={activeTab === 'pictures'}
                  icon={<PhotoIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="posts" 
                  label="Discussion" 
                  current={activeTab === 'posts'}
                  icon={<ChatBubbleLeftRightIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="locations" 
                  label="Locations" 
                  current={activeTab === 'locations'}
                  icon={<MapPinIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="rides" 
                  label="Rides" 
                  current={activeTab === 'rides'}
                  icon={<TruckIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="payments" 
                  label="Payments" 
                  current={activeTab === 'payments'}
                  icon={<BanknotesIcon className="mr-3 h-5 w-5" />} 
                />
                <TabItem 
                  id="arrival" 
                  label="Arrival Status" 
                  current={activeTab === 'arrival'}
                  icon={<ClockIcon className="mr-3 h-5 w-5" />} 
                />
              </nav>

              <div className="mt-8 bg-white p-4 rounded-lg shadow">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Event Details
                </h3>
                <dl className="mt-2 divide-y divide-gray-200">
                  <div className="py-2">
                    <dt className="text-xs text-gray-500">Location</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <MapPinIcon className="mr-1 h-4 w-4 text-gray-400" />
                      {event.location || 'No location set'}
                    </dd>
                  </div>
                  <div className="py-2">
                    <dt className="text-xs text-gray-500">Date</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <CalendarIcon className="mr-1 h-4 w-4 text-gray-400" />
                      {event.time || 'No date set'}
                    </dd>
                  </div>
                  <div className="py-2">
                    <dt className="text-xs text-gray-500">Time Range</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <ClockIcon className="mr-1 h-4 w-4 text-gray-400" />
                      {event.timeRange || 'No time range set'}
                    </dd>
                  </div>
                  <div className="py-2">
                    <dt className="text-xs text-gray-500">Attendees</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.members.length + 1} people
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="lg:flex-1">
            <div className="bg-white shadow rounded-lg p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}