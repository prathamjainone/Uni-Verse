import os
import json
import re
import requests
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # Load GROQ_API_KEY from backend/.env

def calculate_match_score(student_profile: dict, project_context: dict) -> dict:
    """
    Evaluates a student's skills and bio against project requirements and description 
    using Groq Llama-3.1 API synchronously for deep semantic matching.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return {"score": 0, "reason": "AI service not configured on server."}
    client = Groq(api_key=groq_key, timeout=15.0)
    
    # Extract data
    skills = ", ".join(student_profile.get("skills", []))
    bio = student_profile.get("bio", "No bio provided.")
    github = student_profile.get("github", "")
    
    github_context = "Not provided. Rely heavily on self-reported skills."
    
    if github:
        github_context = f"Username: {github}."
        try:
            # Fetch user info
            u_res = requests.get(f"https://api.github.com/users/{github}", timeout=3)
            if u_res.status_code == 200:
                udata = u_res.json()
                github_context += f" Public Repos: {udata.get('public_repos', 0)}. Followers: {udata.get('followers', 0)}. "
                
                # Fetch repos
                r_res = requests.get(f"https://api.github.com/users/{github}/repos?per_page=10&sort=updated", timeout=3)
                if r_res.status_code == 200:
                    repos = r_res.json()
                    languages = {}
                    for r in repos:
                        if not r.get("fork") and r.get("language"):
                            languages[r["language"]] = languages.get(r["language"], 0) + 1
                    if languages:
                        sorted_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)
                        top_langs = []
                        for i, (k, v) in enumerate(sorted_langs):
                            if i >= 3: break
                            top_langs.append(k)
                        github_context += f" Top Languages in recent repos: {', '.join(top_langs)}."
        except Exception:
            github_context += " (Failed to fetch extended github details)."

    p_title = project_context.get("title", "Project")
    p_desc = project_context.get("description", "")
    p_type = project_context.get("type", "Full-Stack")
    p_diff = project_context.get("difficulty", "Intermediate")
    p_reqs = ", ".join(project_context.get("required_skills", []))
    
    prompt = f"""
    You are a Strategic Talent Matcher for the Uni-Verse platform.
    Perform a DEEP SEMANTIC ANALYSIS to match a candidate to a project.
    
    PROJECT: "{p_title}"
    TYPE: {p_type} | DIFFICULTY: {p_diff}
    MISSION: {p_desc}
    TECHNICAL REQUIREMENTS: {p_reqs}
    
    CANDIDATE:
    SKILLS: {skills}
    BIO: {bio}
    GITHUB DATA: {github_context}
    
    TASK:
    1. Perform a semantic evaluation: How well does the candidate's holistic profile (skills + bio + real-world GitHub activity) align with the project's mission and technical stack?
    2. Look BEYOND keywords. If the project requires "Cloud Scalability" and the candidate has "Distributed Systems" and "AWS", that's a high semantic match even if the exact phrase isn't used.
    3. If the candidate has a GITHUB profile with specific top languages, treat this as verified evidence of skill.
    4. Consider DIFFICULTY: An 'Expert' project requires demonstrated depth in relevant areas.
    5. Evaluate the BIO: Does the candidate's personal mission/experience align with what the project is trying to achieve?
    
    This score and reason will be shown ONLY to the Project Admin to help them vet applicants.
    
    Output a strict JSON response:
    - "score" (integer 0-100)
    - "reason" (a concise, professional explanation of the semantic fit, max 20 words)
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a Semantic Matchmaker AI. Respond ONLY with a raw JSON object with keys 'score' (integer) and 'reason' (string)."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3
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
