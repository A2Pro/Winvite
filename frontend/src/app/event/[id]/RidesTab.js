'use client';

import { useState, useEffect } from 'react';
import { TruckIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';

export default function RidesTab({ eventID, username, event }) {
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // New ride offer form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [departureLocation, setDepartureLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRides();
  }, [eventID]);

  const fetchRides = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_rides?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success') {
        setRides(data.offers || []);
      } else if (data.message !== 'no_rides') {
        setError('Failed to load rides');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfferRide = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    if (!departureLocation || !departureTime || availableSeats < 1) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/add_ride_offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          departureLocation,
          departureTime,
          availableSeats,
          notes,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setMessage('Ride offer added successfully!');
        setRides([...rides, data.rideOffer]);
        setShowOfferForm(false);
        resetForm();
      } else {
        setError('Failed to add ride offer');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDepartureLocation('');
    setDepartureTime('');
    setAvailableSeats(1);
    setNotes('');
  };

  const handleJoinRide = async (rideID) => {
    try {
      const response = await fetch('/api/join_ride', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          rideID,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setRides(
          rides.map((ride) => 
            ride.id === rideID ? data.rideOffer : ride
          )
        );
        setMessage('You have joined the ride!');
      } else if (data.message === 'already_joined') {
        setError('You have already joined this ride');
      } else if (data.message === 'ride_full') {
        setError('This ride is already full');
      } else {
        setError('Failed to join ride');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  };

  const handleLeaveRide = async (rideID) => {
    try {
      const response = await fetch('/api/leave_ride', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          rideID,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setRides(
          rides.map((ride) => 
            ride.id === rideID ? data.rideOffer : ride
          )
        );
        setMessage('You have left the ride');
      } else {
        setError('Failed to leave ride');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <TruckIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Ride Sharing
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
        {!showOfferForm ? (
          <button
            onClick={() => setShowOfferForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <TruckIcon className="-ml-1 mr-2 h-5 w-5" />
            Offer a Ride
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Offer a Ride</h3>
            <form onSubmit={handleOfferRide} className="space-y-4">
              <div>
                <label htmlFor="departureLocation" className="block text-sm font-medium text-gray-700">
                  Departure Location *
                </label>
                <input
                  type="text"
                  id="departureLocation"
                  value={departureLocation}
                  onChange={(e) => setDepartureLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                  placeholder="e.g. North Campus, Downtown, etc."
                  required
                />
              </div>
              
              <div>
                <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700">
                  Departure Time *
                </label>
                <input
                  type="text"
                  id="departureTime"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                  placeholder="e.g. 5:30 PM, 10 minutes before event, etc."
                  required
                />
              </div>
              
              <div>
                <label htmlFor="availableSeats" className="block text-sm font-medium text-gray-700">
                  Available Seats *
                </label>
                <input
                  type="number"
                  id="availableSeats"
                  min="1"
                  max="10"
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                  placeholder="Any additional information about the ride"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOfferForm(false)}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Offer Ride'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Rides</h3>
        
        {rides.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rides available yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Be the first to offer a ride for this event.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => {
              const isDriver = ride.driver === username;
              const isPassenger = ride.passengers && ride.passengers.includes(username);
              const isFull = ride.takenSeats >= ride.availableSeats;
              
              return (
                <div key={ride.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <span className="inline-block h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium">
                          {ride.driver.charAt(0).toUpperCase()}
                        </span>
                        <span className="ml-2 font-medium text-gray-900">
                          {ride.driver} {isDriver && '(You)'}
                        </span>
                      </div>
                      
                      <div className="mt-3 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium text-gray-900">From:</span> <span className="text-gray-900">{ride.departureLocation}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-900">When:</span> <span className="text-gray-900">{ride.departureTime}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-900">Seats:</span> <span className="text-gray-900">{ride.takenSeats} / {ride.availableSeats} taken</span>
                      </p>
                      {ride.notes && (
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">Notes:</span> <span className="text-gray-900">{ride.notes}</span>
                        </p>
                      )}
                    </div>
                    </div>
                    
                    {!isDriver && !isPassenger && !isFull && (
                      <button
                        onClick={() => handleJoinRide(ride.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <UserPlusIcon className="-ml-0.5 mr-1 h-4 w-4" />
                        Join Ride
                      </button>
                    )}
                    
                    {isPassenger && (
                      <button
                        onClick={() => handleLeaveRide(ride.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <UserMinusIcon className="-ml-0.5 mr-1 h-4 w-4" />
                        Leave Ride
                      </button>
                    )}
                    
                    {isFull && !isPassenger && !isDriver && (
                      <span className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-md text-gray-500 bg-gray-50">
                        Ride Full
                      </span>
                    )}
                  </div>
                  
                  {ride.passengers && ride.passengers.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Passengers</h4>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {ride.passengers.map((passenger) => (
                          <li key={passenger} className="flex items-center text-sm">
                            <span className="inline-block h-6 w-6 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-medium">
                              {passenger.charAt(0).toUpperCase()}
                            </span>
                            <span className="ml-1 text-gray-700">
                              {passenger} {passenger === username && '(You)'}
                            </span>
                          </li>
                        ))}
                      </ul>
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