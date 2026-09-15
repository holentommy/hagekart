const map = L.map('map', { keyboard: true, keyboardPanDelta: 50 }).setView([59.9592, 10.9168], 18);

L.tileLayer('https://arcgisonline.com{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

let dataItems = JSON.parse(localStorage.getItem('ravnkollen_data')) || [];
let currentMode = 'marker'; 
let activeLayerGroup = L.layerGroup().addTo(map);
let tempPolygonPoints = [];
let tempPolyline = L.polyline([], {color: '#ffa500'}).addTo(map);
let currentTempCoords = null;

function setMode(mode) {
    currentMode = mode;
    document.getElementById('mode-marker').className = mode === 'marker' ? 'btn-active' : '';
    document.getElementById('mode-polygon').className = mode === 'polygon' ? 'btn-active' : '';
    cancelActiveDrawing();
}

function cancelActiveDrawing() {
    tempPolygonPoints = [];
    tempPolyline.setLatLngs([]);
    document.getElementById('input-form-container').style.display = 'none';
}

map.on('click', function(e) {
    if (currentMode === 'marker') {
        currentTempCoords = { lat: e.latlng.lat, lng: e.latlng.lng, coords: null, geomType: 'marker' };
        showForm();
    } else if (currentMode === 'polygon') {
        tempPolygonPoints.push([e.latlng.lat, e.latlng.lng]);
        tempPolyline.setLatLngs(tempPolygonPoints);
        
        if (tempPolygonPoints.length >= 3) {
            currentTempCoords = { lat: null, lng: null, coords: [...tempPolygonPoints], geomType: 'polygon' };
            showForm();
        }
    }
});

function showForm() {
    document.getElementById('input-form-container').style.display = 'block';
    document.getElementById('plant-name').focus();
}

function saveCurrentItem() {
    const name = document.getElementById('plant-name').value;
    const season = document.getElementById('plant-season').value;
    const info = document.getElementById('plant-info').value;

    if (!name) { alert("Du må skrive et navn"); return; }

    dataItems.push({
        geomType: currentTempCoords.geomType,
        lat: currentTempCoords.lat,
        lng: currentTempCoords.lng,
        coords: currentTempCoords.coords,
        name: name,
        season: season,
        info: info
    });

    localStorage.setItem('ravnkollen_data', JSON.stringify(dataItems));
    
    document.getElementById('plant-name').value = '';
    document.getElementById('plant-info').value = '';
    cancelActiveDrawing();
    renderAll();
}

function renderAll() {
    activeLayerGroup.clearLayers();
    const listEl = document.getElementById('plant-list');
    listEl.innerHTML = '';

    dataItems.forEach((item, index) => {
        let layer;
        const color = item.season === 'Vår' ? '#2ed573' : item.season === 'Forsommer' ? '#eccc68' : item.season === 'Sensommer' ? '#ff7f50' : '#ff4757';
        const popupContent = `<b>${item.name}</b><br>Beskjæres: ${item.season}<br><small>${item.info}</small>`;

        if (item.geomType === 'marker') {
            layer = L.circleMarker([item.lat, item.lng], { radius: 9, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 });
        } else {
            layer = L.polygon(item.coords, { fillColor: color, color: color, weight: 3, fillOpacity: 0.5 });
        }

        layer.bindPopup(popupContent);
        activeLayerGroup.addLayer(layer);

        const li = document.createElement('li');
        li.className = 'plant-item';
        li.style.borderLeftColor = color;
        li.innerHTML = `<span class="delete-btn" onclick="event.stopPropagation(); deleteItem(${index})">&times;</span><strong>${item.name}</strong><span>${item.season}</span>`;
        
        li.onclick = () => {
            if (item.geomType === 'marker') { map.setView([item.lat, item.lng], 19); } 
            else { map.fitBounds(layer.getBounds()); }
            layer.openPopup();
        };
        listEl.appendChild(li);
    });
}

function deleteItem(index) {
    if(confirm("Vil du slette dette elementet?")) {
        dataItems.splice(index, 1);
        localStorage.setItem('ravnkollen_data', JSON.stringify(dataItems));
        renderAll();
    }
}

function filterPlants() {
    const query = document.getElementById('search').value.toLowerCase();
    const items = document.querySelectorAll('.plant-item');
    dataItems.forEach((item, i) => {
        const match = item.name.toLowerCase().includes(query) || item.season.toLowerCase().includes(query);
        items[i].style.display = match ? '' : 'none';
    });
}

// EKSPORT: Genererer en ren JSON tekstfil for nedlasting
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "ravnkollen_kartdata.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// IMPORT: Leser filen og pusher den inn i localStorage
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if(confirm("Vil du overskrive nåværende kartdata med den importerte filen?")) {
                    dataItems = importedData;
                    localStorage.setItem('ravnkollen_data', JSON.stringify(dataItems));
                    renderAll();
                }
            } else {
                alert("Feil filformat. Dataene må være en liste (array).");
            }
        } catch (err) {
            alert("Klarte ikke å lese JSON-filen: " + err.message);
        }
    };
    reader.readAsText(file);
}

renderAll();
