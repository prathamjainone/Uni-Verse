import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def evaluate_with_groq(project_details: dict, candidates: list) -> dict:
    """
    Calls Groq Llama-3.1 to perform high-fidelity team analysis.
    Returns a JSON compatible with the deterministic structure.
    """
    prompt = f"""
    You are an expert AI system evaluating team compatibility for a software project on the Uni-Verse platform.
    Your goal is to provide a High-Fidelity Semantic Compatibility report for the Project Admin.
    
    ### Project Details:
    - Title: {project_details.get('title')}
    - Mission: {project_details.get('description')}
    - Type: {project_details.get('project_type')}
    - Difficulty: {project_details.get('difficulty')}
    - Required Skills: {", ".join(project_details.get('required_skills', []))}
    
    ### Current Team & Applicants:
    {json.dumps(candidates, indent=2)}
    
    ### Task:
    1. Perform a DEEP SEMANTIC ANALYSIS on how well these individuals fit together as a team.
    2. Evaluate COMPATIBILITY WITH EACH OTHER: Do their skills complement each other? (e.g., does a Backend expert have a Frontend partner? Do they share a common mission based on their bios?)
    3. Calculate an OVERALL COMPATIBILITY SCORE (0-100) based on project fit and inter-personal complementarity.
    4. Determine the 'REASON' for this score (recommendation).
    
    Output a strict JSON response:
    {{
      "team_compatibility_score": number, 
      "skill_coverage": number,
      "role_balance_score": number,
      "experience_balance_score": number,
      "recommendation": "Strongly Compatible | Moderate Compatibility | Not Recommended",
      "reasoning": "A concise explanation of why the team fits or doesn't fit together (max 50 words)."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "system", "content": "You are a professional project manager API. Output valid JSON only."},
                      {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        return None

def evaluate_team_compatibility(project_details: dict, candidates: list) -> dict:
    """
    Exclusively uses Groq AI for team analysis. 
    Removes the deterministic fallback to prevent 'hardcoded' feel.
    """
    if not candidates:
        return None

    if client:
        ai_result = evaluate_with_groq(project_details, candidates)
        if ai_result:
            ai_result["project_title"] = project_details.get("title")
            return ai_result
            
    # If AI fails or is missing, return a structured error instead of rules
    return {
        "error": "Intelligence Engine Unavailable",
        "description": "Please ensure your GROQ_API_KEY is configured in the backend/.env file to see AI-powered team reports."
    }
