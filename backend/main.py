from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import json
import os

app = Flask(__name__)
CORS(app, origins=["https://ksp-crimebot.vercel.app", "http://localhost:3000"])

# Load crime data
with open(os.path.join(os.path.dirname(__file__), 'crime_data.json'), 'r', encoding='utf-8') as f:
    crime_data = json.load(f)

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def search_crime_data(query):
    query_lower = query.lower()
    relevant_crimes = []
    for crime in crime_data["crimes"]:
        searchable = f"""
            {crime.get('type', '')} 
            {crime.get('CaseCategory', '')}
            {crime.get('location', '')} 
            {crime.get('district', '')} 
            {crime.get('DistrictName', '')}
            {crime.get('status', '')} 
            {crime.get('CaseStatus', '')}
            {crime.get('modus_operandi', '')} 
            {crime.get('BriefFacts', '')}
            {crime.get('CrimeMajorHead', '')}
            {crime.get('CrimeMinorHead', '')}
            {' '.join(crime.get('accused', []))}
        """.lower()
        if any(word in searchable for word in query_lower.split()):
            relevant_crimes.append(crime)
    return relevant_crimes if relevant_crimes else crime_data["crimes"][:3]

def get_criminal_network(name):
    name_lower = name.lower()
    connections = []
    for link in crime_data["criminal_network"]:
        if name_lower in link.get("from", "").lower() or name_lower in link.get("to", "").lower():
            connections.append(link)
    return connections

def detect_repeat_offenders(crimes):
    accused_count = {}
    accused_cases = {}
    for crime in crimes:
        for accused in crime.get("accused", []):
            accused_count[accused] = accused_count.get(accused, 0) + 1
            if accused not in accused_cases:
                accused_cases[accused] = []
            accused_cases[accused].append(crime.get("id", "Unknown"))
    repeat_offenders = {
        k: {"count": v, "cases": accused_cases[k]}
        for k, v in accused_count.items() if v > 1
    }
    return repeat_offenders

def get_hotspots(crimes):
    location_count = {}
    for crime in crimes:
        loc = crime.get("district") or crime.get("DistrictName") or "Unknown"
        location_count[loc] = location_count.get(loc, 0) + 1
    return sorted(location_count.items(), key=lambda x: x[1], reverse=True)

def early_warning(crimes):
    warnings = []
    location_count = {}
    for crime in crimes:
        loc = crime.get("district") or crime.get("DistrictName") or "Unknown"
        location_count[loc] = location_count.get(loc, 0) + 1
    for loc, count in location_count.items():
        if count >= 3:
            warnings.append({
                "district": loc,
                "crime_count": count,
                "alert": f"HIGH ALERT: {count} crimes in {loc}. Increased patrolling recommended."
            })
    return warnings

def analyze_trends(crimes):
    monthly = {}
    for crime in crimes:
        month = crime.get("date", crime.get("CrimeRegisteredDate", "2025-01"))[:7]
        monthly[month] = monthly.get(month, 0) + 1
    return dict(sorted(monthly.items()))

def build_context(query, relevant_crimes, connections):
    context = "KARNATAKA STATE POLICE - CRIME DATABASE\n\n"
    context += f"Relevant Crime Records ({len(relevant_crimes)} found):\n"
    for crime in relevant_crimes:
        context += f"""
Case ID: {crime.get('id', crime.get('CaseMasterID', 'Unknown'))}
Type: {crime.get('type', crime.get('CaseCategory', 'Unknown'))}
Location: {crime.get('location', crime.get('PoliceStationName', 'Unknown'))}
District: {crime.get('district', crime.get('DistrictName', 'Unknown'))}
Station: {crime.get('station', crime.get('PoliceStationName', 'Unknown'))}
Date: {crime.get('date', crime.get('CrimeRegisteredDate', 'Unknown'))}
Accused: {', '.join(crime.get('accused', ['Unknown']))}
Victim: {crime.get('victim', 'Unknown')}
Status: {crime.get('status', crime.get('CaseStatus', 'Unknown'))}
Modus Operandi: {crime.get('modus_operandi', crime.get('BriefFacts', 'Unknown'))}
Socio-Economic Factor: {crime.get('socio_economic', 'Unknown')}
IPC Section: {crime.get('ActCode', '')} {crime.get('SectionCode', '')}
Crime Head: {crime.get('CrimeMajorHead', '')} - {crime.get('CrimeMinorHead', '')}
Gravity: {crime.get('GravityOffence', 'Unknown')}
---"""
    if connections:
        context += "\n\nCriminal Network Connections:\n"
        for conn in connections:
            context += f"• {conn.get('from','?')} ↔ {conn.get('to','?')} ({conn.get('relationship','?')}) - Cases: {', '.join(conn.get('cases', [])) if conn.get('cases') else 'Associated'}\n"
    return context

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        relevant_crimes = search_crime_data(user_message)

        connections = []
        for crime in crime_data["crimes"]:
            for accused in crime.get("accused", []):
                if accused.lower().split()[0] in user_message.lower():
                    connections = get_criminal_network(accused)
                    break

        context = build_context(user_message, relevant_crimes, connections)
        repeat_offenders = detect_repeat_offenders(crime_data["crimes"])
        hotspots = get_hotspots(crime_data["crimes"])
        warnings = early_warning(crime_data["crimes"])

        system_prompt = f"""You are KSP CrimeBot, an expert crime analyst for Karnataka State Police.
You assist senior investigators, IPS officers, and police personnel.

CRIME DATABASE CONTEXT:
{context}

REPEAT OFFENDERS:
{json.dumps(repeat_offenders, indent=2)}

CURRENT HOTSPOTS:
{json.dumps(hotspots, indent=2)}

EARLY WARNINGS:
{json.dumps(warnings, indent=2)}

RESPONSE RULES:
- Always cite Case IDs (e.g., CR001, CR005)
- Respond in the SAME language as the question
- For Kannada questions, respond FULLY in Kannada script
- For English questions, respond in English
- Be precise and factual
- Highlight repeat offenders and connections
- Prefix urgent matters with ALERT:
- Never fabricate case details"""

        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1000,
            temperature=0.3
        )

        assistant_message = response.choices[0].message.content

        return jsonify({
            'response': assistant_message,
            'relevant_cases': [c.get('id', 'Unknown') for c in relevant_crimes],
            'network_connections': connections
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    crimes = crime_data["crimes"]
    by_type = {}
    by_district = {}
    by_status = {}
    for crime in crimes:
        t = crime.get('type') or crime.get('CaseCategory') or 'Unknown'
        d = crime.get('district') or crime.get('DistrictName') or 'Unknown'
        s = crime.get('status') or crime.get('CaseStatus') or 'Unknown'
        by_type[t] = by_type.get(t, 0) + 1
        by_district[d] = by_district.get(d, 0) + 1
        by_status[s] = by_status.get(s, 0) + 1
    return jsonify({
        'total_cases': len(crimes),
        'by_type': by_type,
        'by_district': by_district,
        'by_status': by_status,
        'network_links': len(crime_data["criminal_network"])
    })

@app.route('/api/network', methods=['GET'])
def network():
    return jsonify(crime_data["criminal_network"])

@app.route('/api/repeat-offenders', methods=['GET'])
def repeat_offenders_route():
    offenders = detect_repeat_offenders(crime_data["crimes"])
    return jsonify(offenders)

@app.route('/api/hotspots', methods=['GET'])
def hotspots_route():
    spots = get_hotspots(crime_data["crimes"])
    return jsonify(spots)

@app.route('/api/warnings', methods=['GET'])
def warnings_route():
    alerts = early_warning(crime_data["crimes"])
    return jsonify(alerts)

@app.route('/api/trends', methods=['GET'])
def trends_route():
    trend_data = analyze_trends(crime_data["crimes"])
    return jsonify(trend_data)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'KSP CrimeBot'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)