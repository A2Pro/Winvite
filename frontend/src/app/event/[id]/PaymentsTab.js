'use client';

import { useState, useEffect } from 'react';
import { CreditCardIcon, PlusIcon, UserIcon, ArrowPathIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe - replace with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RAdrPPxzDzWsllx98949DKtUxhtXM85vOTVigPMdhCSARAeXfmQvvmZqTzjMUwwCDvUOHPblb294gmTUAe6e9bb00qaOIpHtQ');

// Stripe Payment Form Component
function CheckoutForm({ amount, eventID, username, onSuccess, isProcessing, setIsProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create payment intent on server
      const response = await fetch('/api/create_payment_intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: amount,
          eventID: eventID,
          username: username
        })
      });
      
      const data = await response.json();
      
      if (data.message !== 'success') {
        throw new Error(data.error || 'Failed to create payment intent');
      }
      
      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: username,
          },
        }
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      } else {
        // Payment succeeded
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Processing...
          </>
        ) : (
          <>
            <CreditCardIcon className="-ml-1 mr-2 h-5 w-5" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  );
}

export default function PaymentsTab({ eventID, username, event }) {
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [contributionAmount, setContributionAmount] = useState(20);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  
  const isHost = username === event?.host;

  useEffect(() => {
    fetchEventCard();
  }, [eventID]);

  const fetchEventCard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/get_event_card?eventID=${eventID}&username=${username}`);
      const data = await response.json();

      if (data.message === 'success') {
        setCard(data.card);
      } else if (data.message !== 'card_not_found') {
        setError('Failed to load card details');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createEventCard = async () => {
    setIsCreating(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/create_event_card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          eventID,
        }),
      });

      const data = await response.json();

      if (data.message === 'success' || data.message === 'card_exists') {
        setMessage(data.message === 'success' ? 'Card created successfully!' : 'Card already exists');
        setCard(data.card_data);
      } else {
        setError('Failed to create card');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    setMessage('Payment successful!');
    
    // Optimistically update UI
    const paymentAmount = contributionAmount;
    const cardLoadAmount = paymentAmount * 0.99;
    
    setCard(prevCard => ({
      ...prevCard,
      current_balance: (prevCard.current_balance || 0) + cardLoadAmount,
      total_contributions: (prevCard.total_contributions || 0) + paymentAmount,
      contributions_count: (prevCard.contributions_count || 0) + 1
    }));
    
    try {
      // Call the manual endpoint
      const response = await fetch('/api/manual_payment_success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntent: paymentIntent.id,
          eventID: eventID,
          username: username,
          amount: paymentAmount
        })
      });
      
      const data = await response.json();
      console.log('Manual payment processing result:', data);
      
      // Fetch the updated card data after a delay
      setTimeout(() => {
        fetchEventCard();
      }, 2000);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Error updating card balance. Please contact support.');
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
        <CreditCardIcon className="mr-2 h-5 w-5 text-indigo-500" />
        Event Payments
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

      {!card ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Card Set Up</h3>
          <p className="text-gray-500 mb-4">
            Create a virtual payment card for this event to collect contributions from attendees.
          </p>
          
          {isHost ? (
            <button
              onClick={createEventCard}
              disabled={isCreating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Event Card
                </>
              )}
            </button>
          ) : (
            <p className="text-sm text-amber-600">
              Only the event host can create a payment card.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Event Card Balance</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">
                  ${card.current_balance.toFixed(2)}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Contributions</p>
                <p className="text-lg font-medium text-gray-900">${card.total_contributions.toFixed(2)}</p>
                <p className="text-xs text-gray-500">From {card.contributions_count} {card.contributions_count === 1 ? 'person' : 'people'}</p>
              </div>
            </div>
            
            {/* Card details section - only shown to host and contributors */}
            {(card.card_pan && card.card_cvv && card.card_expiration) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Card Details</h4>
                  <button
                    onClick={() => setShowCardDetails(!showCardDetails)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {showCardDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                {showCardDetails ? (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Card Number</p>
                        <p className="text-md font-medium text-gray-900">{card.card_pan}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expiration</p>
                        <p className="text-md font-medium text-gray-900">{card.card_expiration}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">CVV</p>
                        <p className="text-md font-medium text-gray-900">{card.card_cvv}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      This is a virtual card that can be used for online purchases or added to a digital wallet.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 bg-gray-50 rounded-md">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">Card details are hidden</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Show a message if the user doesn't have access to card details */}
            {!card.card_pan && card.user_contributed === false && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-amber-50 p-4 rounded-md text-amber-700 text-sm">
                  Contribute below to get access to the card details.
                </div>
              </div>
            )}
          </div>
          
          {/* Contribution section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contribute to Event Card</h3>
            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Contribution Amount
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-gray-700">$</span>
                <input
                  type="range"
                  id="amount"
                  min="5"
                  max="100"
                  step="5"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="ml-4 text-gray-900 font-medium w-16 text-right">
                  ${contributionAmount.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                A 1% fee will be deducted from your contribution.
              </p>
            </div>
            
            <Elements stripe={stripePromise}>
              <CheckoutForm
                amount={contributionAmount}
                eventID={eventID}
                username={username}
                onSuccess={handlePaymentSuccess}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </Elements>
          </div>
          
          {/* Contribution history */}
          {card.payments && card.payments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contribution History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {card.payments.map((payment) => (
                      <tr key={payment._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{payment.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}