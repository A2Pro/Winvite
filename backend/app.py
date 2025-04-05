from flask import Flask, render_template, request, jsonify, send_file, make_response
from dotenv import load_dotenv
import os
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import requests
import random
from flask_cors import CORS
from werkzeug.utils import secure_filename
import datetime
import json
from bson import json_util
import base64
from openai import OpenAI
from gridfs import GridFS
import io


load_dotenv()
MONGO_URI_STRING = os.getenv("MONGO_URI_STRING")

app = Flask(__name__)

CORS(app)


UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
mongoClient = MongoClient(MONGO_URI_STRING, server_api=ServerApi('1'))

login = mongoClient["Login"]
passwordsDB = login["Passwords"]
events = mongoClient["Events"]
ridesDB = mongoClient["Rides"]
fs = GridFS(events)
eventsDB = events["Events"]
picturesDB = events["Pictures"]
timesDB = events["Times"]





@app.route("/api/verify_login", methods=["POST"])
def verify_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    entry = passwordsDB.find_one({"username":username})
    if(entry):
        if(entry.get("password") == password):
            return jsonify({"message" : "success"})
        else:
            return jsonify({"message": "invalid_password"})
    else:
        return jsonify({"message" : "invalid_user"})
    
@app.route("/api/add_user", methods=["POST"])
def add_user():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    entry  = passwordsDB.find_one({"username":username})
    if(entry):
        return jsonify({"message":"user_exists"})
    passwordsDB.insert_one({"username":username, "password":password})
    return jsonify({"message":"success"})

@app.route("/api/create_event", methods=["POST"])
def create_event():
    data = request.get_json()
    username = data.get("username")
    location = data.get("location")
    time = data.get("time")
    timeRange = data.get("timeRange")
    isTimeFixed = data.get("isTimeFixed", True)  
    isLocationFixed = data.get("isLocationFixed", True)  
    
    eventID = random.randint(100000, 999999)
    while(eventsDB.find_one({"eventID" : eventID})):
        eventID = eventID = random.randint(100000, 999999)
    
    eventsDB.insert_one({
        "host": username, 
        "eventID": eventID, 
        "members": [], 
        "posts": [], 
        "location": location, 
        "time": time, 
        "timeRange": timeRange,
        "isTimeFixed": isTimeFixed,
        "isLocationFixed": isLocationFixed
    })
    
    picturesDB.insert_one({"eventID": eventID, "pictures": {}})
    timesDB.insert_one({"eventID": eventID, "times": {}})
    
    
    ridesDB.insert_one({"eventID": eventID, "offers": [], "requests": []})
    
    return jsonify({"message": "success"})


@app.route("/api/join_event", methods=["POST"])
def join_event():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    if username in event.get("members", []):
        return jsonify({"message": "already_joined"})
    eventsDB.update_one(
        {"eventID": int(event_id)},
        {"$push": {"members": username}}
    )
    
    return jsonify({
        "message": "success",
        "eventDetails": {
            "host": event.get("host"),
            "location": event.get("location"),
            "time": event.get("time"),
            "timeRange": event.get("timeRange")
        }
    })

@app.route("/api/add_ride_offer", methods=["POST"])
def add_ride_offer():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    departure_location = data.get("departureLocation")
    departure_time = data.get("departureTime")
    available_seats = data.get("availableSeats", 0)
    notes = data.get("notes", "")
    
    if not all([username, event_id, departure_location, departure_time, available_seats]):
        return jsonify({"message": "missing_parameters"})
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    if username not in event.get("members", []) and username != event.get("host"):
        return jsonify({"message": "not_authorized"})
    
    
    
    ride_id = str(datetime.datetime.now().timestamp())
    
    ride_offer = {
        "id": ride_id,
        "driver": username,
        "departureLocation": departure_location,
        "departureTime": departure_time,
        "availableSeats": int(available_seats),
        "takenSeats": 0,
        "passengers": [],
        "notes": notes,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    rides_doc = ridesDB.find_one({"eventID": int(event_id)})
    
    if rides_doc:
        ride_offers = rides_doc.get("offers", [])
        ride_offers.append(ride_offer)
        
        rides.update_one(
            {"eventID": int(event_id)},
            {"$set": {"offers": ride_offers}}
        )
    else:
        rides.insert_one({
            "eventID": int(event_id),
            "offers": [ride_offer],
            "requests": []
        })
    
    return jsonify({
        "message": "success",
        "rideOffer": ride_offer
    })

@app.route("/api/join_ride", methods=["POST"])
def join_ride():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    ride_id = data.get("rideID")
    
    if not all([username, event_id, ride_id]):
        return jsonify({"message": "missing_parameters"})
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    if username not in event.get("members", []) and username != event.get("host"):
        return jsonify({"message": "not_authorized"})
    
    rides_doc = ridesDB.find_one({"eventID": int(event_id)})
    
    if not rides_doc:
        return jsonify({"message": "no_rides"})
    
    ride_offers = rides_doc.get("offers", [])
    ride_found = False
    
    for i, offer in enumerate(ride_offers):
        if offer.get("id") == ride_id:
            ride_found = True
            
            if username == offer.get("driver"):
                return jsonify({"message": "driver_cannot_join"})
            
            if username in offer.get("passengers", []):
                return jsonify({"message": "already_joined"})
            
            if offer.get("takenSeats", 0) >= offer.get("availableSeats", 0):
                return jsonify({"message": "ride_full"})
            
            
            passengers = offer.get("passengers", [])
            passengers.append(username)
            
            ride_offers[i]["passengers"] = passengers
            ride_offers[i]["takenSeats"] = len(passengers)
            
            rides.update_one(
                {"eventID": int(event_id)},
                {"$set": {"offers": ride_offers}}
            )
            
            return jsonify({
                "message": "success",
                "rideOffer": ride_offers[i]
            })
    
    if not ride_found:
        return jsonify({"message": "ride_not_found"})

@app.route("/api/leave_ride", methods=["POST"])
def leave_ride():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    ride_id = data.get("rideID")
    
    if not all([username, event_id, ride_id]):
        return jsonify({"message": "missing_parameters"})
    
   
    
    rides_doc = rides.find_one({"eventID": int(event_id)})
    
    if not rides_doc:
        return jsonify({"message": "no_rides"})
    
    ride_offers = rides_doc.get("offers", [])
    
    for i, offer in enumerate(ride_offers):
        if offer.get("id") == ride_id:
            if username not in offer.get("passengers", []):
                return jsonify({"message": "not_in_ride"})
            
            
            passengers = offer.get("passengers", [])
            passengers.remove(username)
            
            ride_offers[i]["passengers"] = passengers
            ride_offers[i]["takenSeats"] = len(passengers)
            
            ridesDB.update_one(
                {"eventID": int(event_id)},
                {"$set": {"offers": ride_offers}}
            )
            
            return jsonify({
                "message": "success",
                "rideOffer": ride_offers[i]
            })
    
    return jsonify({"message": "ride_not_found"})

@app.route("/api/get_rides", methods=["GET"])
def get_rides():
    event_id = request.args.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    rides_doc = ridesDB.find_one({"eventID": int(event_id)})
    
    if not rides_doc:
        return jsonify({
            "message": "no_rides",
            "offers": [],
            "requests": []
        })
    
    return jsonify({
        "message": "success",
        "offers": rides_doc.get("offers", []),
        "requests": rides_doc.get("requests", [])
    })
    
@app.route("/api/update_times", methods=["POST"])
def update_times():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    available_times = data.get("availableTimes")  
    
    
    if not all([username, event_id, available_times]):
        return jsonify({"message": "missing_parameters"})
    
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    if username not in event.get("members", []) and username != event.get("host"):
        return jsonify({"message": "not_authorized"})
    
    
    times_doc = timesDB.find_one({"eventID": int(event_id)})
    
    if times_doc:
        
        times = times_doc.get("times", {})
        times[username] = available_times
        
        timesDB.update_one(
            {"eventID": int(event_id)},
            {"$set": {"times": times}}
        )
    else:
        
        timesDB.insert_one({
            "eventID": int(event_id),
            "times": {username: available_times}
        })
    
    
    all_slots = []
    times = timesDB.find_one({"eventID": int(event_id)}).get("times", {})
    
    for user, slots in times.items():
        all_slots.extend(slots)
    
    
    slot_counts = {}
    for slot in all_slots:
        if slot in slot_counts:
            slot_counts[slot] += 1
        else:
            slot_counts[slot] = 1
    
    if slot_counts:
        max_count = max(slot_counts.values())
        best_slots = [slot for slot, count in slot_counts.items() if count == max_count]
    else:
        best_slots = []
    
    return jsonify({
        "message": "success",
        "bestTimeSlots": best_slots,
        "allTimeSlots": slot_counts,
        "totalParticipants": len(times)
    })

@app.route("/api/get_best_times", methods=["GET"])
def get_best_times():
    event_id = request.args.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    times_doc = timesDB.find_one({"eventID": int(event_id)})
    
    if not times_doc or not times_doc.get("times"):
        return jsonify({
            "message": "no_availability_data",
            "bestTimeSlots": [],
            "allTimeSlots": {},
            "totalParticipants": 0
        })
    
    
    all_slots = []
    times = times_doc.get("times", {})
    
    for user, slots in times.items():
        all_slots.extend(slots)
    
    slot_counts = {}
    for slot in all_slots:
        if slot in slot_counts:
            slot_counts[slot] += 1
        else:
            slot_counts[slot] = 1
    
    
    if slot_counts:
        max_count = max(slot_counts.values())
        best_slots = [slot for slot, count in slot_counts.items() if count == max_count]
    else:
        best_slots = []
    
    return jsonify({
        "message": "success",
        "bestTimeSlots": best_slots,
        "allTimeSlots": slot_counts,
        "totalParticipants": len(times)
    })


@app.route("/api/get_events", methods=["GET"])
def get_events():
    try:
        username = request.args.get("username")
        if not username:
            return jsonify({"message": "missing_username"})
        
        
        hosting_events = list(eventsDB.find({"host": username}))
        
        
        member_events = list(eventsDB.find({"members": username}))
        
        
        for event in hosting_events + member_events:
            event["_id"] = str(event["_id"])
        
        return jsonify({
            "message": "success",
            "hosting": hosting_events,
            "member": member_events
        })
    except Exception as e:
        print(e)


    

@app.route("/api/add_post", methods=["POST"])
def add_post():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    content = data.get("content")
    
    if not all([username, event_id, content]):
        return jsonify({"message": "missing_parameters"})
    
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    if username not in event.get("members", []) and username != event.get("host"):
        return jsonify({"message": "not_authorized"})
    
    
    post = {
        "id": str(datetime.datetime.now().timestamp()),
        "username": username,
        "content": content,
        "timestamp": datetime.datetime.now().isoformat(),
        "likes": []
    }
    
    eventsDB.update_one(
        {"eventID": int(event_id)},
        {"$push": {"posts": post}}
    )
    
    return jsonify({
        "message": "success",
        "post": post
    })


@app.route("/api/get_posts", methods=["GET"])
def get_posts():
    event_id = request.args.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    return jsonify({
        "message": "success",
        "posts": event.get("posts", [])
    })


@app.route("/api/like_post", methods=["POST"])
def like_post():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    post_id = data.get("postID")
    
    if not all([username, event_id, post_id]):
        return jsonify({"message": "missing_parameters"})
    if("%" in event_id):
        event_id = event_id.split("%")[1]
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    posts = event.get("posts", [])
    for i, post in enumerate(posts):
        if post.get("id") == post_id:
            likes = post.get("likes", [])
            
            if username in likes:
                
                likes.remove(username)
            else:
                
                likes.append(username)
            
            posts[i]["likes"] = likes
            
            eventsDB.update_one(
                {"eventID": int(event_id)},
                {"$set": {"posts": posts}}
            )
            
            return jsonify({
                "message": "success",
                "liked": username in likes,
                "likes": len(likes)
            })
    
    return jsonify({"message": "post_not_found"})


@app.route("/api/vote_location", methods=["POST"])
def vote_location():
    data = request.get_json()
    username = data.get("username")
    event_id = data.get("eventID")
    location = data.get("location")
    
    if not all([username, event_id, location]):
        return jsonify({"message": "missing_parameters"})
    
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    if username not in event.get("members", []) and username != event.get("host"):
        return jsonify({"message": "not_authorized"})
    
    
    if not hasattr(app, 'locationsDB'):
        locations = mongoClient["Events"]["Locations"]
        app.locationsDB = locations
    else:
        locations = app.locationsDB
    
    location_doc = locations.find_one({"eventID": int(event_id)})
    
    if location_doc:
        location_votes = location_doc.get("locations", {})
        if location in location_votes:
            if username in location_votes[location]:
                
                location_votes[location].remove(username)
                if not location_votes[location]:
                    del location_votes[location]
            else:
                
                location_votes[location].append(username)
        else:
            location_votes[location] = [username]
        
        locations.update_one(
            {"eventID": int(event_id)},
            {"$set": {"locations": location_votes}}
        )
    else:
        locations.insert_one({
            "eventID": int(event_id),
            "locations": {location: [username]}
        })
    
    return jsonify({
        "message": "success"
    })


@app.route("/api/get_locations", methods=["GET"])
def get_locations():
    event_id = request.args.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    if not hasattr(app, 'locationsDB'):
        locations = mongoClient["Events"]["Locations"]
        app.locationsDB = locations
    else:
        locations = app.locationsDB
    
    location_doc = locations.find_one({"eventID": int(event_id)})
    
    if not location_doc:
        return jsonify({
            "message": "no_locations",
            "locations": {}
        })
    
    return jsonify({
        "message": "success",
        "locations": location_doc.get("locations", {})
    })


@app.route("/api/generate_event", methods=["POST"])
def generate_event():
    data = request.get_json()
    username = data.get("username")
    location = data.get("location")
    time = data.get("time")
    
    if not all([username, location, time]):
        return jsonify({"message": "missing_parameters"})
    
    try:
        
        city = location.split(',')[0].strip()
        
        
        time_descriptions = {
            "morning": "Morning (8am-12pm)",
            "afternoon": "Afternoon (12pm-5pm)",
            "evening": "Evening (5pm-9pm)",
            "night": "Night (9pm-late)",
            "weekend": "This Weekend"
        }
        time_description = time_descriptions.get(time, time)
        
        
        prompt = f"""
        Generate a fun and creative event idea for a friend group in {city} during the {time_description}.
        Format the response as a JSON object with these fields:
        - title: A catchy title for the event (max 30 characters)
        - description: A brief description of the activity (max 100 characters)
        - location: A specific place or type of venue in {city}
        - time: The time period ({time_description})
        
        Make it specific to {city} if possible, and appropriate for the time of day.
        Only return the JSON object, nothing else.
        """

        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful event planning assistant that generates creative hangout ideas for friend groups."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        
        import json
        result_text = response.choices[0].message.content.strip()
        
        try:
            event_data = json.loads(result_text)
        except json.JSONDecodeError:
            
            event_data = {
                "title": f"Local Hangout in {city}",
                "description": f"Meet up with friends in {city} during the {time_description}.",
                "location": city,
                "time": time_description
            }
        
        return jsonify({
            "message": "success",
            "event": event_data
        })
        
    except Exception as e:
        print(f"Error generating event: {str(e)}")
        return jsonify({
            "message": "error",
            "error": str(e)
        })
    
@app.route("/api/get_event", methods=["GET"])
def get_event():
    event_id = request.args.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    event = eventsDB.find_one({"eventID": int(event_id)})
    if not event:
        return jsonify({"message": "invalid_id"})
    
    
    event["_id"] = str(event["_id"])
    
    return jsonify({
        "message": "success",
        "event": event
    })

@app.route("/api/upload_picture", methods=["POST"])
def upload_picture():
    if 'file' not in request.files:
        return jsonify({"message": "no_file"})
    
    file = request.files['file']
    event_id = request.form.get('eventID')
    username = request.form.get('username')
    
    if not event_id or not username:
        return jsonify({"message": "missing_parameters"})
    
    if file.filename == '':
        return jsonify({"message": "no_file_selected"})
    
    if file and allowed_file(file.filename):
        
        file_bytes = file.read()
        
        
        base64_encoded = base64.b64encode(file_bytes).decode('utf-8')
        
        
        image_id = str(datetime.datetime.now().timestamp())
        
        
        image_data = {
            "id": image_id,
            "filename": secure_filename(file.filename),
            "content_type": file.content_type,
            "base64_data": base64_encoded,
            "uploaded_at": datetime.datetime.now().isoformat()
        }
        
        
        picture_doc = picturesDB.find_one({"eventID": int(event_id)})
        if picture_doc:
            pictures = picture_doc.get("pictures", {})
            if username in pictures:
                pictures[username].append(image_id)  
            else:
                pictures[username] = [image_id]  
            
            
            picturesDB.update_one(
                {"eventID": int(event_id)},
                {"$set": {"pictures": pictures}}
            )
            
            
            db = mongoClient["Events"]
            images_collection = db["Images"]
            images_collection.insert_one(image_data)
        
        return jsonify({
            "message": "success",
            "image_id": image_id
        })
    
    return jsonify({"message": "invalid_file_type"})

@app.route("/api/get_pictures", methods=["POST"])
def get_pictures():
    data = request.get_json()
    event_id = data.get("eventID")
    
    if not event_id:
        return jsonify({"message": "missing_eventID"})
    
    try:
        picture_doc = picturesDB.find_one({"eventID": int(event_id)})
        if not picture_doc or not picture_doc.get("pictures"):
            return jsonify({
                "message": "no_pictures",
                "pictures": {}
            })
        
        return jsonify({
            "message": "success",
            "pictures": picture_doc.get("pictures")
        })
    except Exception as e:
        print(f"Error in get_pictures: {str(e)}")
        return jsonify({"message": "server_error", "error": str(e)})

@app.route("/api/get_image/<image_id>", methods=["GET"])
def get_image(image_id):
    try:
        
        db = mongoClient["Events"]
        images_collection = db["Images"]
        image_data = images_collection.find_one({"id": image_id})
        
        if not image_data:
            return jsonify({"message": "image_not_found"}), 404
        
        
        response = make_response(base64.b64decode(image_data.get("base64_data")))
        response.headers.set('Content-Type', image_data.get("content_type", "image/jpeg"))
        return response
    except Exception as e:
        print(f"Error serving image: {str(e)}")
        return jsonify({"message": "error", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)