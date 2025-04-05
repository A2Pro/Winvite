'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

export default function PicturesTab({ eventID, username }) {
  const [pictures, setPictures] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [file, setFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchPictures();
  }, [eventID]);

  const fetchPictures = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_pictures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventID }),
      });
      
      const data = await response.json();

      if (data.message === 'success') {
        setPictures(data.pictures);
      } else if (data.message !== 'no_pictures') {
        setError('Failed to load pictures');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadStatus('Please select a file first');
      return;
    }

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventID', eventID);
    formData.append('username', username);

    try {
      const response = await fetch('/api/upload_picture', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.message === 'success') {
        setUploadStatus('Upload successful!');
        setFile(null);
        fetchPictures();
      } else {
        setUploadStatus(`Upload failed: ${data.message}`);
      }
    } catch (err) {
      setUploadStatus('Something went wrong. Please try again.');
      console.error(err);
    }
  };

  // Helper function to get image URL
  const getImageUrl = (imageId) => {
    return `/api/get_image/${imageId}`;
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
        <PhotoIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Event Pictures
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload New Picture</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="block">
              <span className="sr-only">Choose file</span>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CloudArrowUpIcon className="-ml-1 mr-2 h-5 w-5" />
              Upload
            </button>
          </div>
          {uploadStatus && (
            <p className={`text-sm ${uploadStatus.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
              {uploadStatus}
            </p>
          )}
        </form>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Event Gallery</h3>
        
        {Object.keys(pictures).length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pictures yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading a picture.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(pictures).map(([user, userPictures]) => (
              <div key={user} className="space-y-2">
                <h4 className="font-medium text-gray-900">{user}'s Pictures</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userPictures.map((imageId, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={getImageUrl(imageId)}
                        alt={`Uploaded by ${user}`}
                        className="h-40 w-full object-cover rounded-lg shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                        <button 
                          onClick={() => setSelectedImage(imageId)}
                          className="opacity-0 group-hover:opacity-100 text-white bg-black bg-opacity-50 px-3 py-1 rounded-md text-sm"
                        >
                          View Full
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing full images */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="max-w-4xl max-h-screen p-4">
            <img 
              src={getImageUrl(selectedImage)} 
              alt="Full size" 
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}