from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from bson import ObjectId
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= Models =============

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    birthday: str
    zodiac_sign: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    birthday: str
    zodiac_sign: str
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None

class LinkPartnerRequest(BaseModel):
    partner_email: EmailStr

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    mood: Optional[str] = None
    is_shared: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class JournalEntryCreate(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None
    is_shared: bool = False

class Challenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    couple_id: str
    title: str
    description: str
    status: str = "active"  # active, resolved, in_progress
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChallengeCreate(BaseModel):
    title: str
    description: str
    status: str = "active"

class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    couple_id: str
    exercise_type: str  # communication, boundary, gratitude
    question: str
    user_responses: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExerciseCreate(BaseModel):
    exercise_type: str

class ExerciseResponse(BaseModel):
    exercise_id: str
    response: str

class MeditationRequest(BaseModel):
    context: Optional[str] = None
    mood: Optional[str] = None

class AIAdviceRequest(BaseModel):
    situation: str
    context: Optional[str] = None

class HoroscopeResponse(BaseModel):
    sign: str
    daily_reading: str
    date: str

class CompatibilityResponse(BaseModel):
    sign1: str
    sign2: str
    compatibility_score: int
    analysis: str

# ============= Utility Functions =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

def get_zodiac_sign(birthday: str) -> str:
    """Extract zodiac sign from birthday format: YYYY-MM-DD or MM-DD"""
    try:
        if '-' in birthday:
            parts = birthday.split('-')
            month = int(parts[-2])
            day = int(parts[-1])
        else:
            return "Unknown"
        
        zodiac_dates = [
            (1, 20, "Capricorn"), (2, 19, "Aquarius"), (3, 21, "Pisces"),
            (4, 20, "Aries"), (5, 21, "Taurus"), (6, 21, "Gemini"),
            (7, 23, "Cancer"), (8, 23, "Leo"), (9, 23, "Virgo"),
            (10, 23, "Libra"), (11, 22, "Scorpio"), (12, 22, "Sagittarius"),
            (12, 31, "Capricorn")
        ]
        
        for i, (m, d, sign) in enumerate(zodiac_dates):
            if month < m or (month == m and day <= d):
                return sign
        return "Capricorn"
    except:
        return "Unknown"

async def get_ai_response(system_message: str, user_message: str) -> str:
    """Get response from Claude AI"""
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        message = UserMessage(text=user_message)
        response = await chat.send_message(message)
        return response
    except Exception as e:
        logging.error(f"AI Error: {str(e)}")
        return "I'm having trouble connecting to my guidance system right now. Please try again in a moment."

# ============= Auth Routes =============

@api_router.post("/auth/signup")
async def signup(user: UserSignup):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    zodiac = get_zodiac_sign(user.birthday) if not user.zodiac_sign else user.zodiac_sign
    
    user_dict = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "birthday": user.birthday,
        "zodiac_sign": zodiac,
        "partner_id": None,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    return {
        "token": token,
        "user": UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            birthday=user.birthday,
            zodiac_sign=zodiac
        )
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get partner info if exists
    partner_name = None
    if user.get("partner_id"):
        partner = await db.users.find_one({"id": user["partner_id"]})
        if partner:
            partner_name = partner.get("name")
    
    token = create_access_token({"sub": user["id"]})
    
    return {
        "token": token,
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            birthday=user["birthday"],
            zodiac_sign=user["zodiac_sign"],
            partner_id=user.get("partner_id"),
            partner_name=partner_name
        )
    }

# ============= Profile Routes =============

@api_router.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    partner_name = None
    if user.get("partner_id"):
        partner = await db.users.find_one({"id": user["partner_id"]})
        if partner:
            partner_name = partner.get("name")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        birthday=user["birthday"],
        zodiac_sign=user["zodiac_sign"],
        partner_id=user.get("partner_id"),
        partner_name=partner_name
    )

@api_router.post("/profile/link-partner")
async def link_partner(request: LinkPartnerRequest, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    partner = await db.users.find_one({"email": request.partner_email})
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found with this email")
    
    if partner["id"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot link yourself as a partner")
    
    # Link both users
    await db.users.update_one({"id": user_id}, {"$set": {"partner_id": partner["id"]}})
    await db.users.update_one({"id": partner["id"]}, {"$set": {"partner_id": user_id}})
    
    return {"message": "Partner linked successfully", "partner_name": partner["name"]}

# ============= Journal Routes =============

@api_router.post("/journal")
async def create_journal(entry: JournalEntryCreate, user_id: str = Depends(get_current_user)):
    journal_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": entry.title,
        "content": entry.content,
        "mood": entry.mood,
        "is_shared": entry.is_shared,
        "created_at": datetime.utcnow()
    }
    
    await db.journal_entries.insert_one(journal_dict)
    return JournalEntry(**journal_dict)

@api_router.get("/journal")
async def get_journal_entries(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    # Get user's own entries
    entries = await db.journal_entries.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    
    # Get partner's shared entries if partner exists
    if user.get("partner_id"):
        partner_entries = await db.journal_entries.find({
            "user_id": user["partner_id"],
            "is_shared": True
        }).sort("created_at", -1).to_list(1000)
        entries.extend(partner_entries)
    
    # Sort all by date
    entries.sort(key=lambda x: x["created_at"], reverse=True)
    
    return [JournalEntry(**entry) for entry in entries]

@api_router.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user_id: str = Depends(get_current_user)):
    result = await db.journal_entries.delete_one({"id": entry_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"message": "Journal entry deleted"}

# ============= AI Routes =============

@api_router.post("/ai/meditation")
async def get_meditation_guide(request: MeditationRequest, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    context_info = f"User's name is {user['name']} and their zodiac sign is {user['zodiac_sign']}."
    if request.mood:
        context_info += f" They are feeling {request.mood} today."
    if request.context:
        context_info += f" Additional context: {request.context}"
    
    system_message = """You are a compassionate spiritual guide and meditation expert. 
    You help couples deepen their connection through mindfulness and spiritual practices.
    Provide warm, personalized meditation guidance that resonates with their situation.
    Keep responses concise (2-3 paragraphs) and actionable."""
    
    user_message = f"{context_info}\n\nProvide a personalized meditation or spiritual guidance for them today."
    
    response = await get_ai_response(system_message, user_message)
    
    # Save meditation session
    await db.meditation_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "prompt": request.context or request.mood,
        "response": response,
        "created_at": datetime.utcnow()
    })
    
    return {"guidance": response}

@api_router.post("/ai/advice")
async def get_relationship_advice(request: AIAdviceRequest, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    partner = None
    if user.get("partner_id"):
        partner = await db.users.find_one({"id": user["partner_id"]})
    
    context_info = f"User {user['name']} ({user['zodiac_sign']})"
    if partner:
        context_info += f" and their partner {partner['name']} ({partner['zodiac_sign']})"
    
    if request.context:
        context_info += f". Additional context: {request.context}"
    
    system_message = """You are a wise relationship counselor with deep understanding of 
    emotional dynamics, communication, and spiritual connections. You help couples navigate 
    challenges with empathy and practical wisdom. Consider zodiac compatibility when relevant.
    Provide thoughtful, actionable advice in a warm and supportive tone. Keep responses 
    concise (2-4 paragraphs)."""
    
    user_message = f"{context_info}\n\nSituation: {request.situation}\n\nProvide thoughtful guidance."
    
    response = await get_ai_response(system_message, user_message)
    
    return {"advice": response}

# ============= Horoscope Routes =============

@api_router.get("/horoscope/daily")
async def get_daily_horoscope(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    today = datetime.utcnow().date().isoformat()
    
    # Check if we have today's horoscope cached
    cached = await db.horoscopes.find_one({"sign": user["zodiac_sign"], "date": today})
    if cached:
        return HoroscopeResponse(
            sign=user["zodiac_sign"],
            daily_reading=cached["reading"],
            date=today
        )
    
    # Generate new horoscope
    system_message = f"""You are a knowledgeable astrologer. Provide insightful daily 
    horoscope readings that focus on relationships, emotional wellbeing, and personal growth.
    Keep readings positive and actionable (2-3 sentences)."""
    
    user_message = f"Provide today's horoscope reading for {user['zodiac_sign']}."
    
    reading = await get_ai_response(system_message, user_message)
    
    # Cache it
    await db.horoscopes.insert_one({
        "sign": user["zodiac_sign"],
        "date": today,
        "reading": reading,
        "created_at": datetime.utcnow()
    })
    
    return HoroscopeResponse(
        sign=user["zodiac_sign"],
        daily_reading=reading,
        date=today
    )

@api_router.get("/horoscope/compatibility")
async def get_compatibility(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    if not user.get("partner_id"):
        raise HTTPException(status_code=400, detail="No partner linked")
    
    partner = await db.users.find_one({"id": user["partner_id"]})
    
    # Check cache
    signs_key = f"{user['zodiac_sign']}_{partner['zodiac_sign']}"
    cached = await db.compatibility.find_one({"signs_key": signs_key})
    
    if cached:
        return CompatibilityResponse(
            sign1=user["zodiac_sign"],
            sign2=partner["zodiac_sign"],
            compatibility_score=cached["score"],
            analysis=cached["analysis"]
        )
    
    # Generate compatibility analysis
    system_message = """You are an expert astrologer specializing in relationship compatibility.
    Provide insightful analysis of zodiac compatibility, highlighting strengths and areas for 
    growth. Be encouraging and constructive. End with a compatibility score out of 100."""
    
    user_message = f"Analyze the compatibility between {user['zodiac_sign']} and {partner['zodiac_sign']}. Provide score at the end."
    
    analysis = await get_ai_response(system_message, user_message)
    
    # Extract score (simple heuristic - look for number before "out of 100" or "/100")
    score = 75  # default
    if "out of 100" in analysis.lower():
        try:
            parts = analysis.lower().split("out of 100")[0].split()
            score = int(parts[-1])
        except:
            pass
    
    # Cache it
    await db.compatibility.insert_one({
        "signs_key": signs_key,
        "sign1": user["zodiac_sign"],
        "sign2": partner["zodiac_sign"],
        "score": score,
        "analysis": analysis,
        "created_at": datetime.utcnow()
    })
    
    return CompatibilityResponse(
        sign1=user["zodiac_sign"],
        sign2=partner["zodiac_sign"],
        compatibility_score=score,
        analysis=analysis
    )

# ============= Challenge Routes =============

@api_router.post("/challenges")
async def create_challenge(challenge: ChallengeCreate, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    if not user.get("partner_id"):
        raise HTTPException(status_code=400, detail="No partner linked")
    
    # Create couple_id (sorted combination of user ids)
    couple_id = "_".join(sorted([user_id, user["partner_id"]]))
    
    challenge_dict = {
        "id": str(uuid.uuid4()),
        "couple_id": couple_id,
        "title": challenge.title,
        "description": challenge.description,
        "status": challenge.status,
        "created_by": user_id,
        "created_at": datetime.utcnow()
    }
    
    await db.challenges.insert_one(challenge_dict)
    return Challenge(**challenge_dict)

@api_router.get("/challenges")
async def get_challenges(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    if not user.get("partner_id"):
        return []
    
    couple_id = "_".join(sorted([user_id, user["partner_id"]]))
    
    challenges = await db.challenges.find({"couple_id": couple_id}).sort("created_at", -1).to_list(1000)
    return [Challenge(**c) for c in challenges]

@api_router.put("/challenges/{challenge_id}")
async def update_challenge_status(challenge_id: str, status: str, user_id: str = Depends(get_current_user)):
    result = await db.challenges.update_one(
        {"id": challenge_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    return {"message": "Challenge updated"}

# ============= Exercise Routes =============

@api_router.post("/exercises")
async def create_exercise(exercise: ExerciseCreate, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    if not user.get("partner_id"):
        raise HTTPException(status_code=400, detail="No partner linked")
    
    couple_id = "_".join(sorted([user_id, user["partner_id"]]))
    
    # Generate exercise question based on type
    questions = {
        "communication": [
            "What's one thing you wish I understood better about you?",
            "When do you feel most heard and valued in our relationship?",
            "What's a conversation we've been avoiding that we should have?",
            "How do you prefer to be comforted when you're upset?",
            "What's something you need more of from me?",
            "When do you feel most connected to me?",
            "What's one way I could show my love that would mean the most to you?",
            "How can I better support you when you're stressed?",
            "What's something you've wanted to tell me but haven't found the right moment?",
            "How do you like to resolve conflicts - do you need space or immediate discussion?",
            "What makes you feel truly seen and understood by me?",
            "What's a dream or goal you have that you'd like my support with?"
        ],
        "boundary": [
            "What's one boundary that's important for you in our relationship?",
            "When do you need alone time, and how can I support that?",
            "What makes you feel safe and respected in our relationship?",
            "What are your boundaries around phone/social media use when we're together?",
            "How do you feel about sharing passwords or access to devices?",
            "What topics or jokes make you uncomfortable that I should avoid?",
            "What's your ideal balance between couple time and friend time?",
            "How much physical affection do you need, and when is it too much?",
            "What are your boundaries around discussing our relationship with others?",
            "What's something that crosses a line for you that I might not realize?",
            "How do you feel about surprise visits or unplanned changes to plans?",
            "What personal space or items are especially important to you?"
        ],
        "gratitude": [
            "What's something I did this week that made you feel loved?",
            "What quality do you most appreciate about our relationship?",
            "What's a small gesture that means a lot to you?",
            "What's one thing I do that always makes you smile?",
            "What's a moment we shared recently that you're grateful for?",
            "What's something about my personality that you find endearing?",
            "What's a way I've grown or changed that you appreciate?",
            "What's something I do that makes your life easier?",
            "What's a memory with me that you cherish?",
            "What's something you've learned from being in this relationship?",
            "What's a strength I have that complements you well?",
            "What's something I said or did that made you feel special lately?"
        ]
    }
    
    import random
    question = random.choice(questions.get(exercise.exercise_type, ["Share your thoughts."]))
    
    exercise_dict = {
        "id": str(uuid.uuid4()),
        "couple_id": couple_id,
        "exercise_type": exercise.exercise_type,
        "question": question,
        "user_responses": {},
        "created_at": datetime.utcnow()
    }
    
    await db.exercises.insert_one(exercise_dict)
    return Exercise(**exercise_dict)

@api_router.get("/exercises")
async def get_exercises(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    
    if not user.get("partner_id"):
        return []
    
    couple_id = "_".join(sorted([user_id, user["partner_id"]]))
    
    exercises = await db.exercises.find({"couple_id": couple_id}).sort("created_at", -1).to_list(1000)
    return [Exercise(**e) for e in exercises]

@api_router.post("/exercises/respond")
async def respond_to_exercise(response: ExerciseResponse, user_id: str = Depends(get_current_user)):
    exercise = await db.exercises.find_one({"id": response.exercise_id})
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Update response
    user_responses = exercise.get("user_responses", {})
    user_responses[user_id] = response.response
    
    await db.exercises.update_one(
        {"id": response.exercise_id},
        {"$set": {"user_responses": user_responses}}
    )
    
    return {"message": "Response saved"}

# ============= Health Check =============

@api_router.get("/")
async def root():
    return {"message": "Relationship Companion API", "status": "running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
