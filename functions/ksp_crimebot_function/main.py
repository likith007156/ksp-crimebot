from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import json
import os

app = Flask(__name__)
CORS(app)

# Load crime data
with open(os.path.join(os.path.dirname(__file__), 'crime_data.json'), 'r') as f:
    crime_data = json.load(f)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def search_crime_data(query):
    """Simple keyword-based search over crime data"""
    query_lower = query.lower()
    relevant_crimes = []
    
    for crime in crime_data["crimes"]:
        # Check if query matches any field
        searchable = f"{crime['type']} {crime['location']} {crime['district']} {crime['status']} {crime['modus_operandi']} {' '.join(crime['accused'])}".lower()
        if any(word in searchable for word in query_lower.split()):
            relevant_crimes.append(crime)
    
    return relevant_crimes if relevant_crimes else crime_data["crimes"][:3]

def get_criminal_network(name):
    """Get criminal network connections"""
    name_lower = name.lower()
    connections = []
    
    for link in crime_data["criminal_network"]:
        if name_lower in link["from"].lower() or name_lower in link["to"].lower():
            connections.append(link)
    
    return connections

def build_context(query, relevant_crimes, connections):
    """Build context string for Claude"""
    context = "KARNATAKA STATE POLICE - CRIME DATABASE\n\n"
    context += f"Relevant Crime Records ({len(relevant_crimes)} found):\n"
    
    for crime in relevant_crimes:
        context += f"""
Case ID: {crime['id']}
Type: {crime['type']}
Location: {crime['location']} ({crime['district']})
Station: {crime['station']}
Date: {crime['date']}
Accused: {', '.join(crime['accused'])}
Victim: {crime['victim']}
Status: {crime['status']}
Modus Operandi: {crime['modus_operandi']}
Socio-Economic Factor: {crime['socio_economic']}
---"""
    
    if connections:
        context += "\n\nCriminal Network Connections:\n"
        for conn in connections:
            context += f"• {conn['from']} ↔ {conn['to']} ({conn['relationship']}) - Cases: {', '.join(conn['cases']) if conn['cases'] else 'Associated'}\n"
    
    return context

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Search relevant crime data
        relevant_crimes = search_crime_data(user_message)
        
        # Get criminal network if name mentioned
        connections = []
        for crime in crime_data["crimes"]:
            for accused in crime["accused"]:
                if accused.lower().split()[0] in user_message.lower():
                    connections = get_criminal_network(accused)
                    break
        
        # Build context
        context = build_context(user_message, relevant_crimes, connections)
        
        # System prompt
        system_prompt = f"""You are KSP CrimeBot, an intelligent assistant for Karnataka State Police investigators.
You help analyze crime data, identify patterns, and provide actionable insights.

You have access to the following crime database context:
{context}

Guidelines:
- Answer in the same language as the question (English or Kannada)
- Be precise and factual based on the data provided
- Highlight patterns, repeat offenders, and connections
- Always mention case IDs when referencing specific cases
- For Kannada queries, respond in Kannada script
- Provide actionable intelligence for investigators
- Never reveal sensitive data to unauthorized users"""

        # Build messages for Claude
        messages = conversation_history + [{"role": "user", "content": user_message}]
        
        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=system_prompt,
            messages=messages
        )
        
        assistant_message = response.content[0].text
        
        return jsonify({
            'response': assistant_message,
            'relevant_cases': [c['id'] for c in relevant_crimes],
            'network_connections': connections
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Get crime statistics"""
    crimes = crime_data["crimes"]
    
    # Count by type
    by_type = {}
    by_district = {}
    by_status = {}
    
    for crime in crimes:
        by_type[crime['type']] = by_type.get(crime['type'], 0) + 1
        by_district[crime['district']] = by_district.get(crime['district'], 0) + 1
        by_status[crime['status']] = by_status.get(crime['status'], 0) + 1
    
    return jsonify({
        'total_cases': len(crimes),
        'by_type': by_type,
        'by_district': by_district,
        'by_status': by_status,
        'network_links': len(crime_data["criminal_network"])
    })

@app.route('/api/network', methods=['GET'])
def network():
    """Get full criminal network data"""
    return jsonify(crime_data["criminal_network"])

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'KSP CrimeBot'})

def handler(context, event):
    """Catalyst handler"""
    return app

if __name__ == '__main__':
    app.run(debug=True, port=5000)