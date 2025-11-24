document.addEventListener('DOMContentLoaded', () => {
    // Initialize Map
    const map = L.map('map').setView([37.2, -122], 10); // Center of USA roughly
    window.map = map; // Expose for testing

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // UI Elements
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const statusMessage = document.getElementById('status-message');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.querySelector('.progress-container');

    // State
    let markers = [];

    // Event Listeners
    fileInput.addEventListener('change', handleFileUpload);

    const manualAddBtn = document.getElementById('manual-add-btn');
    const manualNameInput = document.getElementById('manual-name');
    const manualAddressInput = document.getElementById('manual-address');
    const manualGenderInput = document.getElementById('manual-gender');
    const manualEligibleInput = document.getElementById('manual-eligible');
    const findPairingsBtn = document.getElementById('find-pairings-btn');
    const downloadBtn = document.getElementById('download-btn');

    manualAddBtn.addEventListener('click', handleManualEntry);
    findPairingsBtn.addEventListener('click', handleFindPairings);
    downloadBtn.addEventListener('click', handleDownload);

    // Modal Elements
    const exclusionModal = document.getElementById('exclusion-modal');
    const exclusionList = document.getElementById('exclusion-list');
    const cancelExclusionBtn = document.getElementById('cancel-exclusion-btn');

    cancelExclusionBtn.addEventListener('click', () => {
        exclusionModal.style.display = 'none';
    });

    async function handleManualEntry() {
        const name = manualNameInput.value.trim();
        const address = manualAddressInput.value.trim();
        const gender = manualGenderInput.value;
        const eligible = manualEligibleInput.checked;

        if (!address) {
            statusMessage.textContent = 'Please enter an address.';
            statusMessage.style.color = 'var(--error-color)';
            return;
        }

        statusMessage.textContent = 'Geocoding address...';
        statusMessage.style.color = 'var(--text-secondary)';
        manualAddBtn.disabled = true;

        try {
            const coords = await geocodeAddress(address);
            if (coords) {
                addMarker(coords, name || 'Unknown Name', address, gender, eligible);
                statusMessage.textContent = 'Address added to map!';
                statusMessage.style.color = 'var(--success-color)';

                // Center map on new marker
                map.setView([coords.lat, coords.lon], 13);

                // Clear inputs
                manualNameInput.value = '';
                manualAddressInput.value = '';
                manualGenderInput.value = 'male';
                manualEligibleInput.checked = true;
            } else {
                statusMessage.textContent = 'Could not find location for this address.';
                statusMessage.style.color = 'var(--error-color)';
            }
        } catch (error) {
            console.error('Manual entry error:', error);
            statusMessage.textContent = 'Error processing address.';
            statusMessage.style.color = 'var(--error-color)';
        } finally {
            manualAddBtn.disabled = false;
        }
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        fileNameDisplay.textContent = file.name;
        statusMessage.textContent = 'Reading file...';
        statusMessage.style.color = 'var(--text-secondary)';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) {
                    throw new Error('JSON must be an array of objects.');
                }
                processAddresses(data);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                statusMessage.textContent = 'Error: Invalid JSON file.';
                statusMessage.style.color = 'var(--error-color)';
            }
        };
        reader.readAsText(file);
    }

    async function processAddresses(data) {
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        const total = data.length;
        let processed = 0;
        let successCount = 0;

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        statusMessage.textContent = `Processing 0/${total} addresses...`;

        // We need to rate limit requests to Nominatim (max 1 per second)
        // We'll use a simple delay loop

        for (const item of data) {
            if (!item.address) {
                processed++;
                updateProgress(processed, total);
                continue;
            }

            try {
                const coords = await geocodeAddress(item.address);
                if (coords) {
                    // Default to male and eligible if not specified
                    const gender = item.gender ? item.gender.toLowerCase() : 'male';
                    const eligible = item.eligible !== undefined ? item.eligible : true;
                    addMarker(coords, item.name || 'Unknown Name', item.address, gender, eligible);
                    successCount++;
                }
            } catch (err) {
                console.warn(`Failed to geocode: ${item.address}`, err);
            }

            processed++;
            updateProgress(processed, total);

            // Wait 1.1 seconds to be safe with rate limits
            await new Promise(resolve => setTimeout(resolve, 1100));
        }

        statusMessage.textContent = `Done! Placed ${successCount} markers out of ${total} entries.`;
        statusMessage.style.color = 'var(--success-color)';

        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    function updateProgress(current, total) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        statusMessage.textContent = `Processing ${current}/${total} addresses...`;
    }

    async function geocodeAddress(address) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'AddressMapperTool/1.0' // Polite User-Agent
                }
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const results = await response.json();

            if (results && results.length > 0) {
                return {
                    lat: parseFloat(results[0].lat),
                    lon: parseFloat(results[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    function addMarker(coords, name, address, gender, eligible) {
        const marker = L.marker([coords.lat, coords.lon]).addTo(map);

        // Apply styles
        const markerEl = marker.getElement();
        if (markerEl) {
            if (gender === 'female') {
                markerEl.classList.add('marker-female');
            }
            if (!eligible) {
                markerEl.classList.add('marker-ineligible');
            }
        }

        // Store original data on the marker object for easy access
        marker.data = { name, address, gender, eligible };

        const popupContent = createPopupContent(name, address, gender, eligible);
        marker.bindPopup(popupContent);

        // Event delegation for popup buttons
        marker.on('popupopen', () => {
            const popupNode = marker.getPopup().getElement();

            // Remove button
            const removeBtn = popupNode.querySelector('.btn-remove');
            if (removeBtn) {
                removeBtn.onclick = () => removeMarker(marker);
            }

            // Edit button
            const editBtn = popupNode.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.onclick = () => editMarker(marker);
            }
        });

        markers.push(marker);
    }

    function createPopupContent(name, address, gender, eligible) {
        const genderDisplay = gender.charAt(0).toUpperCase() + gender.slice(1);
        const eligibleDisplay = eligible ? 'Eligible' : 'Not Eligible';

        return `
            <div class="popup-content-view">
                <div class="popup-name">${escapeHtml(name)}</div>
                <div class="popup-address">${escapeHtml(address)}</div>
                <div class="popup-details">
                    <span class="popup-tag">${escapeHtml(genderDisplay)}</span>
                    <span class="popup-tag">${escapeHtml(eligibleDisplay)}</span>
                </div>
                <div class="popup-actions">
                    <button class="popup-btn btn-edit">Edit</button>
                    <button class="popup-btn btn-remove">Remove</button>
                </div>
            </div>
        `;
    }

    function removeMarker(marker) {
        map.removeLayer(marker);
        markers = markers.filter(m => m !== marker);
    }

    function editMarker(marker) {
        const { name, address, gender, eligible } = marker.data;

        const editContent = `
            <div class="popup-edit-form">
                <input type="text" class="popup-input edit-name" value="${escapeHtml(name)}" placeholder="Name">
                <input type="text" class="popup-input edit-address" value="${escapeHtml(address)}" placeholder="Address">
                <select class="popup-input edit-gender">
                    <option value="male" ${gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${gender === 'female' ? 'selected' : ''}>Female</option>
                </select>
                <label class="checkbox-label">
                    <input type="checkbox" class="edit-eligible" ${eligible ? 'checked' : ''}> Eligible Minister
                </label>
                <div class="popup-actions">
                    <button class="popup-btn btn-save">Save</button>
                    <button class="popup-btn btn-cancel">Cancel</button>
                </div>
                <div class="edit-status"></div>
            </div>
        `;

        marker.setPopupContent(editContent);

        setTimeout(() => {
            const popupNode = marker.getPopup().getElement();
            const saveBtn = popupNode.querySelector('.btn-save');
            const cancelBtn = popupNode.querySelector('.btn-cancel');
            const nameInput = popupNode.querySelector('.edit-name');
            const addressInput = popupNode.querySelector('.edit-address');
            const genderInput = popupNode.querySelector('.edit-gender');
            const eligibleInput = popupNode.querySelector('.edit-eligible');
            const statusDiv = popupNode.querySelector('.edit-status');

            saveBtn.onclick = async () => {
                const newName = nameInput.value.trim();
                const newAddress = addressInput.value.trim();
                const newGender = genderInput.value;
                const newEligible = eligibleInput.checked;

                if (!newAddress) {
                    statusDiv.textContent = 'Address required';
                    statusDiv.style.color = 'var(--error-color)';
                    return;
                }

                statusDiv.textContent = 'Updating...';
                statusDiv.style.color = 'var(--text-secondary)';
                saveBtn.disabled = true;

                try {
                    // Only re-geocode if address changed
                    let newCoords = marker.getLatLng();
                    if (newAddress !== address) {
                        const result = await geocodeAddress(newAddress);
                        if (!result) {
                            statusDiv.textContent = 'Address not found';
                            statusDiv.style.color = 'var(--error-color)';
                            saveBtn.disabled = false;
                            return;
                        }
                        newCoords = result;
                    }

                    // Update marker
                    marker.setLatLng([newCoords.lat, newCoords.lon]);
                    marker.data = { name: newName, address: newAddress, gender: newGender, eligible: newEligible };

                    // Update styles
                    const markerEl = marker.getElement();
                    if (markerEl) {
                        markerEl.classList.remove('marker-female', 'marker-ineligible');
                        if (newGender === 'female') markerEl.classList.add('marker-female');
                        if (!newEligible) markerEl.classList.add('marker-ineligible');
                    }

                    // Restore view
                    marker.setPopupContent(createPopupContent(newName, newAddress, newGender, newEligible));

                    // If we moved the marker, we might want to pan to it
                    map.panTo([newCoords.lat, newCoords.lon]);

                } catch (error) {
                    console.error('Update error:', error);
                    statusDiv.textContent = 'Error updating';
                    statusDiv.style.color = 'var(--error-color)';
                    saveBtn.disabled = false;
                }
            };

            cancelBtn.onclick = () => {
                marker.setPopupContent(createPopupContent(name, address, gender, eligible));
            };
        }, 0);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Optimal Pairings Logic ---

    let pairingLines = []; // Store polyline objects

    function handleFindPairings() {
        const eligibleMinisters = markers.filter(m => m.data.eligible);

        if (eligibleMinisters.length < 2) {
            alert('Need at least 2 eligible ministers to form pairings.');
            return;
        }

        if (eligibleMinisters.length % 2 !== 0) {
            showExclusionModal(eligibleMinisters);
        } else {
            calculatePairings(eligibleMinisters);
        }
    }

    function showExclusionModal(ministers) {
        exclusionList.innerHTML = '';
        ministers.forEach(m => {
            const item = document.createElement('div');
            item.className = 'exclusion-item';
            item.textContent = `${m.data.name} (${m.data.address})`;
            item.onclick = () => {
                exclusionModal.style.display = 'none';
                const remaining = ministers.filter(min => min !== m);
                calculatePairings(remaining);
            };
            exclusionList.appendChild(item);
        });
        exclusionModal.style.display = 'flex';
    }

    async function calculatePairings(ministers) {
        statusMessage.textContent = 'Fetching distance matrix...';
        statusMessage.style.color = 'var(--text-secondary)';

        try {
            // 1. Fetch Distance Matrix from OSRM
            const coordinates = ministers.map(m => `${m.getLatLng().lng},${m.getLatLng().lat}`).join(';');
            const url = `https://router.project-osrm.org/table/v1/driving/${coordinates}?annotations=distance`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch distance matrix');

            const data = await response.json();
            const matrix = data.distances; // matrix[i][j] is distance from i to j in meters

            // 2. Optimize Pairings (2-opt)
            statusMessage.textContent = 'Optimizing pairings...';

            // Initial solution: Random or simple sequential
            let indices = Array.from({ length: ministers.length }, (_, i) => i);
            // Shuffle indices for random start
            indices.sort(() => Math.random() - 0.5);

            let pairs = [];
            for (let i = 0; i < indices.length; i += 2) {
                pairs.push([indices[i], indices[i + 1]]);
            }

            // 2-opt Optimization
            let improved = true;
            while (improved) {
                improved = false;
                for (let i = 0; i < pairs.length - 1; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        // Current pairs: (A, B) and (C, D)
                        const [A, B] = pairs[i];
                        const [C, D] = pairs[j];

                        // Current distance
                        const d1 = matrix[A][B] + matrix[C][D];

                        // Swap 1: (A, C) and (B, D)
                        const d2 = matrix[A][C] + matrix[B][D];

                        // Swap 2: (A, D) and (B, C)
                        const d3 = matrix[A][D] + matrix[B][C];

                        if (d2 < d1 && d2 < d3) {
                            pairs[i] = [A, C];
                            pairs[j] = [B, D];
                            improved = true;
                        } else if (d3 < d1 && d3 < d2) {
                            pairs[i] = [A, D];
                            pairs[j] = [B, C];
                            improved = true;
                        }
                    }
                }
            }

            // Map indices back to minister objects
            const finalPairings = pairs.map(pair => ({
                m1: ministers[pair[0]],
                m2: ministers[pair[1]],
                distance: matrix[pair[0]][pair[1]]
            }));

            renderPairings(finalPairings);
            statusMessage.textContent = 'Optimal pairings found!';
            statusMessage.style.color = 'var(--success-color)';

        } catch (error) {
            console.error('Pairing error:', error);
            statusMessage.textContent = 'Error calculating pairings. See console.';
            statusMessage.style.color = 'var(--error-color)';
        }
    }

    function renderPairings(pairs) {
        // Clear existing lines
        pairingLines.forEach(line => map.removeLayer(line));
        pairingLines = [];

        const resultsDiv = document.getElementById('pairings-results');
        const tbody = document.getElementById('pairings-body');
        tbody.innerHTML = '';
        resultsDiv.style.display = 'block';

        pairs.forEach((pair, index) => {
            const { m1, m2, distance } = pair;
            const p1 = m1.getLatLng();
            const p2 = m2.getLatLng();

            // Draw line
            const line = L.polyline([p1, p2], {
                color: 'var(--primary-color)',
                weight: 4,
                opacity: 0.7
            }).addTo(map);
            pairingLines.push(line);

            // Check for same address (distance < 10 meters)
            if (distance < 10) {
                const note = L.tooltip({
                    permanent: true,
                    direction: 'top',
                    className: 'same-address-tooltip'
                })
                    .setContent(`Pair ${index + 1}: Same Address`)
                    .setLatLng(p1)
                    .addTo(map);
                pairingLines.push(note); // Add to array to clear later
            }

            // Add to table
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${m1.data.name}<br><small>${m1.data.address}</small></td>
                <td>${m2.data.name}<br><small>${m2.data.address}</small></td>
                <td>${(distance / 1609.34).toFixed(2)} miles</td>
            `;
            tbody.appendChild(row);
        });

        // Fit bounds to show all lines
        if (pairingLines.length > 0) {
            const group = new L.featureGroup(pairingLines);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    function handleDownload() {
        if (markers.length === 0) {
            alert('No data to download.');
            return;
        }

        const data = markers.map(marker => marker.data);
        const jsonString = JSON.stringify(data, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'ministering_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
