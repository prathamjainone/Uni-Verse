import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # Load GROQ_API_KEY from backend/.env

def calculate_match_score(student_skills: list, hackathon_requirements: str) -> dict:
    """
    Evaluates a student's skills against hackathon requirements using Groq Llama-3 API synchronously.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return {"score": 0, "reason": "AI service not configured on server."}
    client = Groq(api_key=groq_key, timeout=15.0)  # 15s hard timeout
    
    skills_str = ', '.join(student_skills) if student_skills else "No skills listed yet"
    
    prompt = f"""
    You are an expert technical recruiter for Uni-Verse platform matching.
    Evaluate the following student's skills against the hackathon's core requirements.
    
    Student Skills: {skills_str}
    Hackathon Requirements: {hackathon_requirements}
    
    Output a strict JSON response containing exactly two keys:
    - "score" (integer 0-100)
    - "reason" (a single sentence explanation with no newlines or special characters)
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a Matchmaker AI. Respond ONLY with a raw JSON object with keys 'score' (integer) and 'reason' (single sentence string, no newlines)."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Strip ALL control characters (tabs, newlines, etc.) that break JSON parsing
        clean_text = re.sub(r'[\x00-\x1f\x7f]', ' ', response_text)
        
        # Extract JSON object
        json_match = re.search(r'\{[^{}]*\}', clean_text, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON object found in response")
        
        result = json.loads(json_match.group())
        
        if "score" not in result or "reason" not in result:
             raise ValueError("Malformed JSON structure - missing keys")
             
        return {
            "score": int(result["score"]),
            "reason": str(result["reason"]).strip()
        }

    except Exception as e:
        with open("groq_error.txt", "w") as f:
            f.write(repr(e))
        return {
            "score": 0, 
            "reason": "Matchmaking unavailable at the moment."
        }
