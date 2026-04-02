"""
scripts/seed_db.py
-------------------
Populate the database with realistic test data for development/testing.

Usage:
    python scripts/seed_db.py
"""

import sqlite3
import sys
import os
from datetime import datetime, timedelta
import random

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask_bcrypt import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "campus_rideshare.db")

# Test password for all users (hashed)
TEST_PASSWORD = "Test123!"

# ══════════════════════════════════════════════════════════════════════════════
# KENYAN LOCATION DATA - University of Nairobi area
# ══════════════════════════════════════════════════════════════════════════════

# Campus locations (University of Nairobi Main Campus area)
CAMPUS_LOCATIONS = [
    ("UoN Main Gate", -1.2801, 36.8169),
    ("Chiromo Campus", -1.2735, 36.8058),
    ("Engineering Block", -1.2789, 36.8145),
    ("Halls of Residence", -1.2825, 36.8192),
    ("Gandhi Library", -1.2798, 36.8155),
    ("Tower Building", -1.2810, 36.8180),
    ("Student Centre", -1.2795, 36.8162),
    ("Science Complex", -1.2782, 36.8138),
]

# City/Town locations around Nairobi
CITY_LOCATIONS = [
    ("Westlands", -1.2673, 36.8114),
    ("CBD Kencom", -1.2864, 36.8243),
    ("Kilimani", -1.2892, 36.7856),
    ("Karen", -1.3187, 36.7116),
    ("Eastleigh", -1.2750, 36.8478),
    ("South B", -1.3089, 36.8316),
    ("Roysambu", -1.2195, 36.8743),
    ("Langata", -1.3456, 36.7534),
    ("Ngong Road", -1.2975, 36.7823),
    ("Thika Road Mall", -1.2198, 36.8876),
]

# Kenyan user names
USERS = [
    {"full_name": "Brian Kimani", "email": "brian@test.com", "phone": "+254712345678", "role": "driver"},
    {"full_name": "Faith Wanjiku", "email": "faith@test.com", "phone": "+254723456789", "role": "driver"},
    {"full_name": "Kevin Otieno", "email": "kevin@test.com", "phone": "+254734567890", "role": "driver"},
    {"full_name": "Grace Muthoni", "email": "grace@test.com", "phone": "+254745678901", "role": "driver"},
    {"full_name": "Dennis Ochieng", "email": "dennis@test.com", "phone": "+254756789012", "role": "driver"},
    {"full_name": "Nancy Akinyi", "email": "nancy@test.com", "phone": "+254767890123", "role": "rider"},
    {"full_name": "Samuel Kiprop", "email": "samuel@test.com", "phone": "+254778901234", "role": "rider"},
    {"full_name": "Lucy Chebet", "email": "lucy@test.com", "phone": "+254789012345", "role": "rider"},
    {"full_name": "Peter Mwangi", "email": "peter@test.com", "phone": "+254790123456", "role": "rider"},
    {"full_name": "Esther Njeri", "email": "esther@test.com", "phone": "+254701234567", "role": "rider"},
    {"full_name": "James Kamau", "email": "james@test.com", "phone": "+254711234567", "role": "rider"},
    {"full_name": "Mercy Wambui", "email": "mercy@test.com", "phone": "+254722345678", "role": "rider"},
]

# Vehicle data for drivers (common in Kenya)
VEHICLES = [
    {"make": "Toyota", "model": "Vitz", "year": 2018, "color": "White", "seats": 4},
    {"make": "Toyota", "model": "Axio", "year": 2019, "color": "Silver", "seats": 4},
    {"make": "Nissan", "model": "Note", "year": 2020, "color": "Blue", "seats": 4},
    {"make": "Mazda", "model": "Demio", "year": 2019, "color": "Red", "seats": 4},
    {"make": "Subaru", "model": "Impreza", "year": 2017, "color": "Black", "seats": 4},
]

RIDE_NOTES = [
    "AC available. No smoking please.",
    "Friendly driver, safe ride guaranteed!",
    "Will wait 5 minutes at pickup point.",
    "Can accommodate small luggage.",
    "Music requests welcome!",
    "Quiet ride preferred.",
    "Student discount available.",
    None,
]

RATING_COMMENTS = [
    "Great driver, very punctual!",
    "Comfortable ride, would book again.",
    "Safe driving, friendly conversation.",
    "On time and professional.",
    "Excellent service!",
    "Good experience overall.",
    "Very helpful with my luggage.",
    "Clean car, smooth ride.",
    None,
]

NOTIFICATION_TEMPLATES = [
    ("Booking Confirmed", "Your booking for the ride from {origin} to {dest} has been confirmed."),
    ("Ride Starting Soon", "Your ride from {origin} to {dest} starts in 30 minutes."),
    ("New Booking", "You have a new booking request for your ride to {dest}."),
    ("Rating Received", "You received a {rating}-star rating from a recent ride."),
    ("Welcome!", "Welcome to Campus Rideshare! Start finding rides today."),
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def clear_data(conn):
    """Clear all existing data."""
    print("Clearing existing data...")
    tables = [
        "notifications", "ai_chat_history", "refresh_tokens",
        "ratings", "bookings", "rides", "driver_profiles", "users"
    ]
    for table in tables:
        conn.execute(f"DELETE FROM {table}")
    conn.commit()
    print("Data cleared.")


def seed_users(conn):
    """Create test users."""
    print("Creating users...")
    password_hash = generate_password_hash(TEST_PASSWORD).decode("utf-8")
    
    cursor = conn.cursor()
    for user in USERS:
        cursor.execute("""
            INSERT INTO users (full_name, email, phone, password_hash, role, is_active, is_verified)
            VALUES (?, ?, ?, ?, ?, 1, 1)
        """, (user["full_name"], user["email"], user["phone"], password_hash, user["role"]))
    
    conn.commit()
    print(f"Created {len(USERS)} users.")
    return cursor.lastrowid - len(USERS) + 1  # Return first user ID


def seed_driver_profiles(conn, first_user_id):
    """Create driver profiles for users with driver role."""
    print("Creating driver profiles...")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE role = 'driver'")
    driver_ids = [row[0] for row in cursor.fetchall()]
    
    for i, driver_id in enumerate(driver_ids):
        vehicle = VEHICLES[i % len(VEHICLES)]
        license_num = f"GH-{random.randint(1000, 9999)}-{random.randint(10, 99)}"
        plate = f"AS-{random.randint(100, 999)}-{random.randint(10, 99)}"
        
        cursor.execute("""
            INSERT INTO driver_profiles 
            (user_id, license_number, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color, seats_available, is_approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (driver_id, license_num, vehicle["make"], vehicle["model"], 
              vehicle["year"], plate, vehicle["color"], vehicle["seats"]))
    
    conn.commit()
    print(f"Created {len(driver_ids)} driver profiles.")


def seed_rides(conn, target_rides=30):
    """Create approximately target_rides rides."""
    print(f"Creating ~{target_rides} rides...")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE role = 'driver'")
    driver_ids = [row[0] for row in cursor.fetchall()]
    
    rides_created = 0
    now = datetime.now()
    
    # Split rides: ~40% past (completed), ~60% future (scheduled)
    past_rides = int(target_rides * 0.4)
    future_rides = target_rides - past_rides
    
    # Create past rides (completed)
    for i in range(past_rides):
        driver_id = random.choice(driver_ids)
        days_ago = random.randint(1, 14)
        date = now - timedelta(days=days_ago)
        
        # Random origin and destination
        if random.random() > 0.5:
            origin = random.choice(CAMPUS_LOCATIONS)
            dest = random.choice(CITY_LOCATIONS)
        else:
            origin = random.choice(CITY_LOCATIONS)
            dest = random.choice(CAMPUS_LOCATIONS)
        
        hour = random.randint(6, 20)
        minute = random.choice([0, 15, 30, 45])
        departure = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        seats_total = random.randint(2, 4)
        status = random.choice(["completed", "completed", "cancelled"])
        seats_remaining = 0 if status == "completed" else random.randint(1, seats_total)
        price = random.choice([200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0])
        
        cursor.execute("""
            INSERT INTO rides 
            (driver_id, origin, destination, origin_lat, origin_lng, destination_lat, destination_lng,
             departure_time, seats_total, seats_remaining, price_per_seat, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (driver_id, origin[0], dest[0], origin[1], origin[2], dest[1], dest[2],
              departure.strftime("%Y-%m-%d %H:%M:%S"), seats_total, seats_remaining,
              price, status, random.choice(RIDE_NOTES)))
        rides_created += 1
    
    # Create future rides (scheduled)
    for i in range(future_rides):
        driver_id = random.choice(driver_ids)
        days_ahead = random.randint(0, 7)
        date = now + timedelta(days=days_ahead)
        
        # Random origin and destination
        if random.random() > 0.5:
            origin = random.choice(CAMPUS_LOCATIONS)
            dest = random.choice(CITY_LOCATIONS)
        else:
            origin = random.choice(CITY_LOCATIONS)
            dest = random.choice(CAMPUS_LOCATIONS)
        
        # For today, make sure time is in the future
        if days_ahead == 0:
            hour = random.randint(now.hour + 1, 22) if now.hour < 22 else 22
        else:
            hour = random.randint(6, 20)
        minute = random.choice([0, 15, 30, 45])
        departure = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        seats_total = random.randint(2, 4)
        seats_remaining = random.randint(1, seats_total)
        price = random.choice([200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0])
        
        cursor.execute("""
            INSERT INTO rides 
            (driver_id, origin, destination, origin_lat, origin_lng, destination_lat, destination_lng,
             departure_time, seats_total, seats_remaining, price_per_seat, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (driver_id, origin[0], dest[0], origin[1], origin[2], dest[1], dest[2],
              departure.strftime("%Y-%m-%d %H:%M:%S"), seats_total, seats_remaining,
              price, "scheduled", random.choice(RIDE_NOTES)))
        rides_created += 1
    
    conn.commit()
    print(f"Created {rides_created} rides.")


def seed_bookings(conn):
    """Create bookings for rides."""
    print("Creating bookings...")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE role = 'rider'")
    rider_ids = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT id, driver_id, seats_total, status FROM rides")
    rides = cursor.fetchall()
    
    bookings_created = 0
    
    for ride_id, driver_id, seats_total, ride_status in rides:
        # 60% chance of having bookings
        if random.random() > 0.4:
            # 1-3 bookings per ride
            num_bookings = random.randint(1, min(3, seats_total))
            available_riders = [r for r in rider_ids if r != driver_id]
            random.shuffle(available_riders)
            
            for i in range(num_bookings):
                if i >= len(available_riders):
                    break
                    
                rider_id = available_riders[i]
                seats = random.randint(1, 2)
                
                if ride_status == "completed":
                    status = "confirmed"
                elif ride_status == "cancelled":
                    status = "cancelled"
                else:
                    status = random.choice(["pending", "confirmed", "confirmed"])
                
                try:
                    cursor.execute("""
                        INSERT INTO bookings (ride_id, rider_id, seats_booked, status)
                        VALUES (?, ?, ?, ?)
                    """, (ride_id, rider_id, seats, status))
                    bookings_created += 1
                except sqlite3.IntegrityError:
                    pass  # Skip duplicate bookings
    
    conn.commit()
    print(f"Created {bookings_created} bookings.")


def seed_ratings(conn):
    """Create ratings for completed bookings."""
    print("Creating ratings...")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT b.id, b.rider_id, r.driver_id 
        FROM bookings b 
        JOIN rides r ON b.ride_id = r.id 
        WHERE b.status = 'confirmed' AND r.status = 'completed'
    """)
    completed_bookings = cursor.fetchall()
    
    ratings_created = 0
    
    for booking_id, rider_id, driver_id in completed_bookings:
        # 70% chance of rating
        if random.random() < 0.7:
            score = random.choices([3, 4, 5], weights=[1, 3, 6])[0]  # Skewed towards higher ratings
            comment = random.choice(RATING_COMMENTS)
            
            try:
                cursor.execute("""
                    INSERT INTO ratings (booking_id, rater_id, ratee_id, score, comment)
                    VALUES (?, ?, ?, ?, ?)
                """, (booking_id, rider_id, driver_id, score, comment))
                ratings_created += 1
            except sqlite3.IntegrityError:
                pass
    
    conn.commit()
    print(f"Created {ratings_created} ratings.")


def seed_notifications(conn):
    """Create sample notifications for users."""
    print("Creating notifications...")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users")
    user_ids = [row[0] for row in cursor.fetchall()]
    
    notifications_created = 0
    
    for user_id in user_ids:
        # 2-4 notifications per user
        for _ in range(random.randint(2, 4)):
            template = random.choice(NOTIFICATION_TEMPLATES)
            title = template[0]
            message = template[1].format(
                origin=random.choice(CAMPUS_LOCATIONS)[0],
                dest=random.choice(CITY_LOCATIONS)[0],
                rating=random.randint(4, 5)
            )
            is_read = random.choice([0, 0, 1])  # 33% read
            
            cursor.execute("""
                INSERT INTO notifications (user_id, title, message, is_read)
                VALUES (?, ?, ?, ?)
            """, (user_id, title, message, is_read))
            notifications_created += 1
    
    conn.commit()
    print(f"Created {notifications_created} notifications.")


def print_summary(conn):
    """Print summary of seeded data."""
    cursor = conn.cursor()
    
    print("\n" + "=" * 50)
    print("DATABASE SEEDING COMPLETE")
    print("=" * 50)
    
    tables = ["users", "driver_profiles", "rides", "bookings", "ratings", "notifications"]
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table}: {count} records")
    
    print("\n" + "-" * 50)
    print("TEST LOGIN CREDENTIALS:")
    print(f"  Password for all users: {TEST_PASSWORD}")
    print("\n  Sample accounts:")
    print("    Driver: brian@test.com")
    print("    Rider:  nancy@test.com")
    print("-" * 50 + "\n")


def main():
    print(f"Database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("Error: Database file not found. Run the app first to create it.")
        sys.exit(1)
    
    conn = get_connection()
    
    try:
        # Always clear existing data to avoid conflicts
        clear_data(conn)
        
        first_user_id = seed_users(conn)
        seed_driver_profiles(conn, first_user_id)
        seed_rides(conn, target_rides=30)
        seed_bookings(conn)
        seed_ratings(conn)
        seed_notifications(conn)
        
        print_summary(conn)
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
