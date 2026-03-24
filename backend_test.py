#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Relationship Companion App
Tests all endpoints including authentication, partner linking, journaling, AI features, horoscope, challenges, and exercises.
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BASE_URL = "https://harmony-guide-9.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.user1_token = None
        self.user2_token = None
        self.user1_data = None
        self.user2_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, details="", error=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=TIMEOUT)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=TIMEOUT)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)

    def test_health_check(self):
        """Test API health check"""
        response = self.make_request("GET", "/")
        
        if isinstance(response, tuple):
            self.log_result("Health Check", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Health Check", True, f"Status: {data.get('status', 'unknown')}")
            return True
        else:
            self.log_result("Health Check", False, error=f"Status code: {response.status_code}")
            return False

    def test_user_signup(self):
        """Test user signup for both users"""
        # User 1
        user1_data = {
            "email": f"alice.harmony{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePass123!",
            "name": "Alice Johnson",
            "birthday": "1995-03-15",
            "zodiac_sign": "Pisces"
        }
        
        response = self.make_request("POST", "/auth/signup", user1_data)
        
        if isinstance(response, tuple):
            self.log_result("User 1 Signup", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.user1_token = data.get("token")
            self.user1_data = data.get("user")
            self.log_result("User 1 Signup", True, f"User ID: {self.user1_data.get('id')}")
        else:
            self.log_result("User 1 Signup", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # User 2
        user2_data = {
            "email": f"bob.harmony{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePass456!",
            "name": "Bob Smith",
            "birthday": "1992-07-22",
            "zodiac_sign": "Cancer"
        }
        
        response = self.make_request("POST", "/auth/signup", user2_data)
        
        if isinstance(response, tuple):
            self.log_result("User 2 Signup", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.user2_token = data.get("token")
            self.user2_data = data.get("user")
            self.log_result("User 2 Signup", True, f"User ID: {self.user2_data.get('id')}")
            return True
        else:
            self.log_result("User 2 Signup", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_user_login(self):
        """Test user login"""
        if not self.user1_data:
            self.log_result("User Login Test", False, error="No user data available for login test")
            return False
        
        login_data = {
            "email": self.user1_data["email"],
            "password": "SecurePass123!"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if isinstance(response, tuple):
            self.log_result("User Login", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            user = data.get("user")
            self.log_result("User Login", True, f"Token received, User: {user.get('name')}")
            return True
        else:
            self.log_result("User Login", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_get_profile(self):
        """Test get user profile"""
        if not self.user1_token:
            self.log_result("Get Profile", False, error="No auth token available")
            return False
        
        response = self.make_request("GET", "/profile", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Get Profile", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Get Profile", True, f"Profile: {data.get('name')} ({data.get('zodiac_sign')})")
            return True
        else:
            self.log_result("Get Profile", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_link_partner(self):
        """Test partner linking"""
        if not self.user1_token or not self.user2_data:
            self.log_result("Link Partner", False, error="Missing tokens or user data")
            return False
        
        link_data = {
            "partner_email": self.user2_data["email"]
        }
        
        response = self.make_request("POST", "/profile/link-partner", link_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Link Partner", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Link Partner", True, f"Linked to: {data.get('partner_name')}")
            return True
        else:
            self.log_result("Link Partner", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_journal_operations(self):
        """Test journal CRUD operations"""
        if not self.user1_token:
            self.log_result("Journal Operations", False, error="No auth token available")
            return False
        
        # Create journal entry
        journal_data = {
            "title": "My Relationship Journey",
            "content": "Today I reflected on how grateful I am for my partner. We've been growing together and learning to communicate better.",
            "mood": "grateful",
            "is_shared": True
        }
        
        response = self.make_request("POST", "/journal", journal_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Create Journal Entry", False, error=response[1])
            return False
        
        entry_id = None
        if response.status_code == 200:
            data = response.json()
            entry_id = data.get("id")
            self.log_result("Create Journal Entry", True, f"Entry ID: {entry_id}")
        else:
            self.log_result("Create Journal Entry", False, error=f"Status: {response.status_code}")
            return False
        
        # Get journal entries
        response = self.make_request("GET", "/journal", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Get Journal Entries", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Get Journal Entries", True, f"Found {len(data)} entries")
        else:
            self.log_result("Get Journal Entries", False, error=f"Status: {response.status_code}")
            return False
        
        # Delete journal entry
        if entry_id:
            response = self.make_request("DELETE", f"/journal/{entry_id}", token=self.user1_token)
            
            if isinstance(response, tuple):
                self.log_result("Delete Journal Entry", False, error=response[1])
                return False
            
            if response.status_code == 200:
                self.log_result("Delete Journal Entry", True, "Entry deleted successfully")
                return True
            else:
                self.log_result("Delete Journal Entry", False, error=f"Status: {response.status_code}")
                return False
        
        return True

    def test_ai_meditation(self):
        """Test AI meditation guidance"""
        if not self.user1_token:
            self.log_result("AI Meditation", False, error="No auth token available")
            return False
        
        meditation_data = {
            "context": "I've been feeling stressed about work and want to reconnect with my inner peace",
            "mood": "anxious"
        }
        
        response = self.make_request("POST", "/ai/meditation", meditation_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("AI Meditation", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            guidance = data.get("guidance", "")
            if len(guidance) > 50:  # Check if we got meaningful response
                self.log_result("AI Meditation", True, f"Guidance received ({len(guidance)} chars)")
                return True
            else:
                self.log_result("AI Meditation", False, error="Response too short or empty")
                return False
        else:
            self.log_result("AI Meditation", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_ai_advice(self):
        """Test AI relationship advice"""
        if not self.user1_token:
            self.log_result("AI Relationship Advice", False, error="No auth token available")
            return False
        
        advice_data = {
            "situation": "My partner and I have been having communication issues lately. We seem to misunderstand each other often.",
            "context": "We've been together for 2 years and usually get along well, but recently we've been stressed."
        }
        
        response = self.make_request("POST", "/ai/advice", advice_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("AI Relationship Advice", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            advice = data.get("advice", "")
            if len(advice) > 50:  # Check if we got meaningful response
                self.log_result("AI Relationship Advice", True, f"Advice received ({len(advice)} chars)")
                return True
            else:
                self.log_result("AI Relationship Advice", False, error="Response too short or empty")
                return False
        else:
            self.log_result("AI Relationship Advice", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_daily_horoscope(self):
        """Test daily horoscope"""
        if not self.user1_token:
            self.log_result("Daily Horoscope", False, error="No auth token available")
            return False
        
        response = self.make_request("GET", "/horoscope/daily", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Daily Horoscope", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            sign = data.get("sign")
            reading = data.get("daily_reading", "")
            if sign and len(reading) > 20:
                self.log_result("Daily Horoscope", True, f"Horoscope for {sign} ({len(reading)} chars)")
                return True
            else:
                self.log_result("Daily Horoscope", False, error="Missing sign or reading too short")
                return False
        else:
            self.log_result("Daily Horoscope", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_compatibility_analysis(self):
        """Test compatibility analysis"""
        if not self.user1_token:
            self.log_result("Compatibility Analysis", False, error="No auth token available")
            return False
        
        response = self.make_request("GET", "/horoscope/compatibility", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Compatibility Analysis", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            sign1 = data.get("sign1")
            sign2 = data.get("sign2")
            score = data.get("compatibility_score")
            analysis = data.get("analysis", "")
            if sign1 and sign2 and score and len(analysis) > 20:
                self.log_result("Compatibility Analysis", True, f"{sign1} + {sign2} = {score}/100")
                return True
            else:
                self.log_result("Compatibility Analysis", False, error="Missing compatibility data")
                return False
        else:
            self.log_result("Compatibility Analysis", False, error=f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_challenges_system(self):
        """Test challenges CRUD operations"""
        if not self.user1_token:
            self.log_result("Challenges System", False, error="No auth token available")
            return False
        
        # Create challenge
        challenge_data = {
            "title": "Weekly Date Night",
            "description": "Plan and execute a special date night together every week for the next month",
            "status": "active"
        }
        
        response = self.make_request("POST", "/challenges", challenge_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Create Challenge", False, error=response[1])
            return False
        
        challenge_id = None
        if response.status_code == 200:
            data = response.json()
            challenge_id = data.get("id")
            self.log_result("Create Challenge", True, f"Challenge ID: {challenge_id}")
        else:
            self.log_result("Create Challenge", False, error=f"Status: {response.status_code}")
            return False
        
        # Get challenges
        response = self.make_request("GET", "/challenges", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Get Challenges", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Get Challenges", True, f"Found {len(data)} challenges")
        else:
            self.log_result("Get Challenges", False, error=f"Status: {response.status_code}")
            return False
        
        # Update challenge status
        if challenge_id:
            response = self.make_request("PUT", f"/challenges/{challenge_id}?status=in_progress", token=self.user1_token)
            
            if isinstance(response, tuple):
                self.log_result("Update Challenge", False, error=response[1])
                return False
            
            if response.status_code == 200:
                self.log_result("Update Challenge", True, "Status updated to in_progress")
                return True
            else:
                self.log_result("Update Challenge", False, error=f"Status: {response.status_code}")
                return False
        
        return True

    def test_exercises_system(self):
        """Test exercises system"""
        if not self.user1_token or not self.user2_token:
            self.log_result("Exercises System", False, error="Missing auth tokens")
            return False
        
        # Create exercise
        exercise_data = {
            "exercise_type": "communication"
        }
        
        response = self.make_request("POST", "/exercises", exercise_data, token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Create Exercise", False, error=response[1])
            return False
        
        exercise_id = None
        if response.status_code == 200:
            data = response.json()
            exercise_id = data.get("id")
            question = data.get("question")
            self.log_result("Create Exercise", True, f"Exercise ID: {exercise_id}, Question: {question[:50]}...")
        else:
            self.log_result("Create Exercise", False, error=f"Status: {response.status_code}")
            return False
        
        # Get exercises
        response = self.make_request("GET", "/exercises", token=self.user1_token)
        
        if isinstance(response, tuple):
            self.log_result("Get Exercises", False, error=response[1])
            return False
        
        if response.status_code == 200:
            data = response.json()
            self.log_result("Get Exercises", True, f"Found {len(data)} exercises")
        else:
            self.log_result("Get Exercises", False, error=f"Status: {response.status_code}")
            return False
        
        # User 1 responds to exercise
        if exercise_id:
            response_data = {
                "exercise_id": exercise_id,
                "response": "I feel most heard when you put away distractions and really listen to what I'm saying, making eye contact and asking follow-up questions."
            }
            
            response = self.make_request("POST", "/exercises/respond", response_data, token=self.user1_token)
            
            if isinstance(response, tuple):
                self.log_result("User 1 Exercise Response", False, error=response[1])
                return False
            
            if response.status_code == 200:
                self.log_result("User 1 Exercise Response", True, "Response saved")
            else:
                self.log_result("User 1 Exercise Response", False, error=f"Status: {response.status_code}")
                return False
            
            # User 2 responds to exercise
            response_data = {
                "exercise_id": exercise_id,
                "response": "I appreciate when you acknowledge my feelings and don't try to immediately solve the problem, but just validate what I'm experiencing."
            }
            
            response = self.make_request("POST", "/exercises/respond", response_data, token=self.user2_token)
            
            if isinstance(response, tuple):
                self.log_result("User 2 Exercise Response", False, error=response[1])
                return False
            
            if response.status_code == 200:
                self.log_result("User 2 Exercise Response", True, "Response saved")
                return True
            else:
                self.log_result("User 2 Exercise Response", False, error=f"Status: {response.status_code}")
                return False
        
        return True

    def test_error_cases(self):
        """Test error handling"""
        # Test unauthorized access
        response = self.make_request("GET", "/profile")
        
        if isinstance(response, tuple):
            self.log_result("Unauthorized Access Test", False, error=response[1])
            return False
        
        if response.status_code == 401 or response.status_code == 403:
            self.log_result("Unauthorized Access Test", True, "Properly rejected unauthorized request")
        else:
            self.log_result("Unauthorized Access Test", False, error=f"Expected 401/403, got {response.status_code}")
            return False
        
        # Test invalid login
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", invalid_login)
        
        if isinstance(response, tuple):
            self.log_result("Invalid Login Test", False, error=response[1])
            return False
        
        if response.status_code == 401:
            self.log_result("Invalid Login Test", True, "Properly rejected invalid credentials")
            return True
        else:
            self.log_result("Invalid Login Test", False, error=f"Expected 401, got {response.status_code}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Signup", self.test_user_signup),
            ("User Login", self.test_user_login),
            ("Get Profile", self.test_get_profile),
            ("Link Partner", self.test_link_partner),
            ("Journal Operations", self.test_journal_operations),
            ("AI Meditation", self.test_ai_meditation),
            ("AI Relationship Advice", self.test_ai_advice),
            ("Daily Horoscope", self.test_daily_horoscope),
            ("Compatibility Analysis", self.test_compatibility_analysis),
            ("Challenges System", self.test_challenges_system),
            ("Exercises System", self.test_exercises_system),
            ("Error Handling", self.test_error_cases)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                if success:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_result(test_name, False, error=f"Exception: {str(e)}")
                failed += 1
        
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        return self.test_results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")