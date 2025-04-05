'use client';

import { useState, useEffect } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function EventInfoTab({ event, username }) {
  const isHost = event.host === username;
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <UserGroupIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Event Information
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Host</h3>
          <p className="text-gray-700">
            {isHost ? 'You are' : event.host + ' is'} hosting this event
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Attendees ({event.members.length + 1})</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <li className="flex items-center">
              <span className="inline-block h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium">
                {event.host.charAt(0).toUpperCase()}
              </span>
              <span className="ml-2 text-gray-900">{event.host} (Host)</span>
            </li>
            {event.members.map((member) => (
              <li key={member} className="flex items-center">
                <span className="inline-block h-8 w-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-medium">
                  {member.charAt(0).toUpperCase()}
                </span>
                <span className="ml-2 text-gray-900">{member}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Event Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                {event.isLocationFixed ? (
                  <p className="font-medium text-gray-900">{event.location || 'To be determined'}</p>
                ) : (
                  <p className="font-medium text-indigo-600">Location voting is enabled</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                {event.isTimeFixed ? (
                  <p className="font-medium text-gray-900">{event.time || 'To be determined'}</p>
                ) : (
                  <p className="font-medium text-indigo-600">Time scheduling is enabled</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Range</p>
                <p className="font-medium text-gray-900">{event.timeRange || 'To be determined'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invite More People</h3>
          <p className="text-gray-600 mb-3">
            Share the event ID with friends to invite them:
          </p>
          <div className="flex items-center">
            <div className="bg-gray-100 px-4 py-2 rounded-l-md font-mono text-gray-800">
              {event.eventID}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(event.eventID.toString());
                alert('Event ID copied to clipboard!');
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 transition"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}