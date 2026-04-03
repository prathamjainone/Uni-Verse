import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def generate_mom_from_transcripts(transcripts: list) -> str:
    """
    Evaluates a list of transcript strings and generates a Minutes of Meeting summary
    using Groq Llama-3 API.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return "⚠️ AI service not configured on server. Cannot generate MOM."
    
    if not transcripts:
        return "⚠️ No transcripts provided. Was anyone speaking during the recording?"

    client = Groq(api_key=groq_key, timeout=20.0)
    
    # Combine transcripts and clean quotes
    combined_text = "\n".join(transcripts).replace('“', '').replace('”', '').replace('"', '')
    
    prompt = f"""
    You are an expert Scrum Master.

    The following is a REAL meeting transcript. It may be informal, unstructured, and may not explicitly label decisions or tasks.

    Your job is to:
    - Infer decisions from agreement statements
    - Infer action items from statements of responsibility or intent
    - Infer ownership based on conversation context

    DO NOT say the transcript is incomplete.
    DO NOT refuse due to missing structure.

    Extract as much structured information as possible.

    Example:

    Transcript:
    Suraj: Rahul complete UI by tomorrow
    Rahul: okay

    Output:
    ### 🎯 Key Decisions
    - UI will be completed by tomorrow

    ### ✅ Action Items
    - [ ] **Rahul**: Complete UI (Deadline: tomorrow)

    ====================
    REAL TRANSCRIPT BELOW:

    Transcript:
    \"\"\"
    {combined_text}
    \"\"\"
    
    Do NOT miss any tasks, assignments, deadlines, or decisions mentioned in the transcript. Identify who is doing what explicitly.

    Format your response in Markdown STRICTLY using the following sections:
    
    ### 📝 Meeting Summary
    A professional overview of the overall discussion and progress.
    
    ### 🎯 Key Decisions
    - Bullet points of major decisions made (e.g., tech stack choices, design changes, deadlines agreed upon).
    
    ### ✅ Action Items
    List every single task assigned or claimed by a person using checkboxes.
    - [ ] **[Name]**: [Task description] (Deadline: [Date/Time] if mentioned)
    
    ### 📌 Key Takeaways & Notes
    - Any other important notes, technical details, or risks discussed.
    
    Important constraints:
    - If a section has no relevant info from the transcript, write "None discussed."
    - Be EXHAUSTIVE with the Action Items. Every person mentioned as doing a task MUST be listed.
    - Do NOT include any preamble, conversational filler, or postamble. Output ONLY the raw Markdown.
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a professional scribe generating Markdown meeting minutes. Output ONLY markdown, no conversational fillers."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5

        )
        
        response_text = chat_completion.choices[0].message.content
        return response_text.strip()

    except Exception as e:
        print(f"Groq MOM Error: {e}")
        return f"⚠️ Failed to generate MOM: {str(e)}"
