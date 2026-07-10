import json

with open('crime_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

default_crime = {
    "id": "UNKNOWN",
    "type": "Unknown",
    "location": "Unknown",
    "district": "Unknown",
    "station": "Unknown PS",
    "date": "2025-01-01",
    "accused": ["Unknown"],
    "victim": "Unknown",
    "status": "Under Investigation",
    "modus_operandi": "Unknown",
    "socio_economic": "Unknown"
}

default_network = {
    "from": "Unknown",
    "to": "Unknown",
    "relationship": "Unknown",
    "cases": []
}

fixed_crimes = []
for crime in data["crimes"]:
    fixed = {**default_crime, **crime}
    if not isinstance(fixed["accused"], list):
        fixed["accused"] = [str(fixed["accused"])]
    fixed_crimes.append(fixed)

fixed_network = []
for link in data.get("criminal_network", []):
    fixed = {**default_network, **link}
    fixed_network.append(fixed)

data["crimes"] = fixed_crimes
data["criminal_network"] = fixed_network

with open('crime_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Fixed {len(fixed_crimes)} crimes and {len(fixed_network)} network links!")