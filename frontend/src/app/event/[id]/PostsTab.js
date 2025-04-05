'use client';

import { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function PostsTab({ eventID, username }) {
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [eventID]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_posts?eventID=${eventID}`);
      const data = await response.json();

      if (data.message === 'success') {
        setPosts(data.posts || []);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/add_post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          content: newPostContent,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setPosts([data.post, ...posts]);
        setNewPostContent('');
      } else {
        setError('Failed to add post');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postID) => {
    try {
      const response = await fetch('/api/like_post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
          postID,
        }),
      });

      const data = await response.json();

      if (data.message === 'success') {
        setPosts(
          posts.map((post) => {
            if (post.id === postID) {
              return {
                ...post,
                likes: data.liked
                  ? [...(post.likes || []), username]
                  : (post.likes || []).filter((user) => user !== username),
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Discussion
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Post a Message</h3>
        <form onSubmit={handleSubmitPost} className="space-y-3">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share updates, ask questions, or coordinate with the group..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !newPostContent.trim()}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Message'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Group Messages</h3>
        
        {posts.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start the conversation by posting a message.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-800 font-medium">
                          {post.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{post.username}</h4>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(post.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{post.content}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    {post.likes && post.likes.includes(username) ? (
                      <HeartIconSolid className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                    <span className="ml-1">{post.likes ? post.likes.length : 0}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}