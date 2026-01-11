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

## Running the Project
**Important:** Due to browser security policies (CORS), this application **cannot** be run by simply opening `index.html` as a file. You must serve it via a local web server.

### Option 1: internal Python server (Recommended)
If you have Python installed:
1.  Open your terminal/command prompt in the project folder.
2.  Run: `python3 -m http.server 8000`
3.  Open `http://localhost:8000` in your browser.

### Option 2: Node.js http-server
If you have Node.js installed:
1.  Run `npx http-server .`
2.  Open the URL shown in the terminal.

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
