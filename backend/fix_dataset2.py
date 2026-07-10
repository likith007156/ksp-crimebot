import json

with open('crime_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

fixed_crimes = []
for crime in data["crimes"]:
    # Use real KSP fields to fill in the "Unknown" basic fields
    crime["location"] = crime.get("PoliceStationName", crime.get("location", "Unknown"))
    crime["district"] = crime.get("DistrictName", crime.get("district", "Unknown"))
    crime["station"] = crime.get("PoliceStationName", crime.get("station", "Unknown"))
    crime["date"] = crime.get("CrimeRegisteredDate", crime.get("date", "2025-01-01"))[:10]
    crime["type"] = crime.get("CrimeMinorHead", crime.get("type", "Unknown"))
    crime["status"] = crime.get("CaseStatus", crime.get("status", "Unknown"))
    crime["modus_operandi"] = crime.get("BriefFacts", crime.get("modus_operandi", "Unknown"))
    fixed_crimes.append(crime)

data["crimes"] = fixed_crimes

with open('crime_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Fixed {len(fixed_crimes)} crimes!")
print(f"Sample - District: {fixed_crimes[0]['district']}, Location: {fixed_crimes[0]['location']}")