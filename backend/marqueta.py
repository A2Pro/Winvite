import requests
import json
from datetime import datetime, timedelta


username = "8847d248-adfb-4a3d-b047-dad6f326daad"
password = "2a0aa7e6-c2a4-453d-9914-efc57eadae51"


base_url = "https://sandbox-DSX api.marqeta.com/v3"


card_product_token = "68ea91ce-d4c4-4d16-ae6e-03fb6cf0c515"


def create_user():
    url = f"{base_url}/users"
    
    
    user_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": f"john.doe.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    }
    
    response = requests.post(
        url,
        auth=(username, password),
        json=user_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 201:
        return response.json()["token"]
    else:
        print(f"Failed to create user: {response.text}")
        return None


def create_card(user_token):
    
    url = f"{base_url}/cards?show_cvv_number=true&show_pan=true"
    
    
    card_data = {
        "user_token": user_token,
        "card_product_token": card_product_token
    }
    
    response = requests.post(
        url,
        auth=(username, password),
        json=card_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 201:
        card_info = response.json()
        print(f"Card successfully created!")
        print(f"Card token: {card_info.get('token')}")
        
        
        print("\nFull Card Details:")
        print(json.dumps(card_info, indent=2))
        
        
        card_data = {
            "token": card_info.get('token'),
            "pan": card_info.get('pan'),
            "cvv": card_info.get('cvv_number'),
            "expiration": card_info.get('expiration'),
            "expiration_time": card_info.get('expiration_time')
        }
        
        return card_data
    else:
        print(f"Failed to create card: {response.text}")
        return None


def get_card_details(card_token):
    url = f"{base_url}/cards/{card_token}/showpan"
    
    response = requests.get(
        url,
        auth=(username, password),
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        details = response.json()
        print("\nDetailed Card PAN Data:")
        print(json.dumps(details, indent=2))
        return details
    else:
        print(f"Failed to get PAN details: {response.text}")
        return None


def simulate_transaction(card_token, amount="10.00"):
    url = f"{base_url}/simulations/cardtransactions/authorization"
    
    
    transaction_data = {
        "amount": amount,
        "card_token": card_token,
        "card_acceptor": {
            "mid": "123456890"  
        },
        "network": "VISA"
    }
    
    response = requests.post(
        url,
        auth=(username, password),
        json=transaction_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code in [200, 201]:
        transaction_info = response.json()
        print(f"\nTransaction successfully simulated!")
        print(json.dumps(transaction_info, indent=2))
        return transaction_info
    else:
        print(f"Failed to simulate transaction: {response.text}")
        return None


if __name__ == "__main__":
    
    print("Creating user...")
    user_token = create_user()
    
    if user_token:
        print(f"User created with token: {user_token}")
        
        
        print("\nCreating card...")
        card_data = create_card(user_token)
        
        if card_data:
            print("\nCard Ready For Use:")
            print(f"Card Number (PAN): {card_data.get('pan')}")
            print(f"CVV: {card_data.get('cvv')}")
            print(f"Expiration: {card_data.get('expiration')}")
            
            
            card_details = get_card_details(card_data.get('token'))
            
            
            print("\nSimulating a $10 transaction...")
            simulate_transaction(card_data.get('token'), "10.00")
            
            
            print("\n====== VIRTUAL CARD USAGE INFORMATION ======")
            print(card_data)
            print(f"Card Number: {card_data.get('pan')}")
            print(f"CVV: {card_data.get('cvv') or card_details.get('cvv_number') if card_details else 'Not available'}")
            print(f"Expiration: {card_data.get('expiration')}")
            print("This card can be used for:")
            print("- Online purchases (eCommerce)")
            print("- Card-not-present transactions")
            print("============================================")