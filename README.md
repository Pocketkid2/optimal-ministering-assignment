# Ministering Assigner - Address Mapper

A web-based tool to visualize addresses on a map, manage minister eligibility, and automatically generate optimal pairings based on driving distance.

## Features
- **Map Visualization**: Displays addresses as interactive pins on an OpenStreetMap.
- **Manual Entry**: Add ministers manually with Name, Address, Gender, and Eligibility status.
- **JSON Import**: Bulk upload ministers via JSON file.
- **Pin Styling**:
    - **Blue**: Male
    - **Red**: Female
    - **Faded**: Ineligible
- **Optimal Pairings**:
    - Uses OSRM API to calculate real driving distances.
    - Automatically pairs eligible ministers to minimize total travel distance.
    - Handles odd numbers of ministers via an exclusion selection.
    - Detects and highlights pairs living at the same address.

## Usage
1.  Open `index.html` in your browser.
2.  Upload a JSON file (see `test_data.json` for format) or manually enter addresses.
3.  Click "Find Optimal Pairings" to generate assignments.

## Data Format
```json
[
    {
        "name": "John Doe",
        "address": "123 Main St, City, State",
        "gender": "male",
        "eligible": true
    }
]
```
