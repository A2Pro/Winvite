'use client';

import { useState, useEffect } from 'react';
import { MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function LocationsTab({ eventID, username, event }) {
  const [locations, setLocations] = useState({});
  const [newLocation, setNewLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [eventID]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_locations?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success') {
        setLocations(data.locations);
      } else if (data.message !== 'no_locations') {
        setError('Failed to load locations');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;

    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/vote_location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          location: newLocation,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setMessage('Location added successfully!');
        setNewLocation('');
        fetchLocations();
      } else {
        setError('Failed to add location');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (location) => {
    try {
      const response = await fetch('/api/vote_location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          location,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        fetchLocations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Sort locations by number of votes (descending)
  const sortedLocations = Object.entries(locations)
    .sort(([, a], [, b]) => b.length - a.length);

  // Determine if there's a winning location
  const winningLocation = sortedLocations.length > 0 ? sortedLocations[0] : null;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <MapPinIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Event Locations
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

      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Current Location</h3>
        <p className="text-gray-700 mb-2">
          {event.location || 'No location has been set yet'}
        </p>
        <p className="text-sm text-gray-500">
          Suggest and vote on locations below to help decide where to meet.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Suggest a Location</h3>
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-grow">
            <label htmlFor="location" className="sr-only">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Restaurant, park, venue, etc."
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newLocation.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <PlusIcon className="-ml-1 mr-1 h-5 w-5" />
            Add
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Location Suggestions</h3>
        
        {sortedLocations.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No locations suggested yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Be the first to suggest a location for this event.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {winningLocation && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-green-800">
                  Leading Location: {winningLocation[0]}
                </h4>
                <p className="text-sm text-green-700">
                  {winningLocation[1].length} {winningLocation[1].length === 1 ? 'vote' : 'votes'}
                </p>
              </div>
            )}
            
            {sortedLocations.map(([location, votes]) => {
              const hasVoted = votes.includes(username);
              const isLeading = winningLocation && location === winningLocation[0];
              
              return (
                <div 
                  key={location} 
                  className={`p-4 rounded-lg border ${isLeading ? 'border-green-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{location}</h4>
                      <p className="text-sm text-gray-500">
                        {votes.length} {votes.length === 1 ? 'vote' : 'votes'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleVote(location)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        hasVoted
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {hasVoted ? 'Voted' : 'Vote'}
                    </button>
                  </div>
                  {votes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Votes from: {votes.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}