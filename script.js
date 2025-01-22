const CLIENT_ID = "793439664402-2tqbg19d0f1rmaqlv54lj9o3c1impek5.apps.googleusercontent.com";
const API_KEY = "AIzaSyDU4e9rbBoNRIZ-9A95gKcdV99NFvR5Wfg";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const authorizeButton = document.getElementById("authorize-button");
const findSlotsButton = document.getElementById("find-slots-button");
const slotsList = document.getElementById("slots-list");

let authInstance;

function loadGapi() {
    console.log("Loading GAPI...");
    gapi.load("client:auth2", () => {
        console.log("GAPI modules loaded.");
        gapi.client
            .init({
                clientId: CLIENT_ID,
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
            })
            .then(() => {
                console.log("GAPI initialized.");
                authInstance = gapi.auth2.getAuthInstance();
                updateUI();
            })
            .catch((error) => {
                console.error("Error loading GAPI:", error);
                // Add user-visible error handling
                displayError("Failed to initialize Google Calendar API. Please try again later.");
            });
    });
}


function updateUI() {
    console.log("Checking sign-in status...");
    if (authInstance.isSignedIn.get()) {
        console.log("User is signed in.");
        authorizeButton.textContent = "Signed In";
        authorizeButton.disabled = true;
        findSlotsButton.disabled = false;
    } else {
        console.log("User is not signed in.");
        authorizeButton.textContent = "Authorize Google Calendar";
        authorizeButton.disabled = false;
        findSlotsButton.disabled = true;
    }
}

authorizeButton.addEventListener("click", () => {
    console.log("Authorize button clicked...");
    authInstance.signIn().then(() => {
        updateUI(); 
    }).catch((error) => {
        console.error("Error during sign-in:", error);
    });
});

findSlotsButton.addEventListener("click", () => {
    console.log("Find Slots button clicked...");
    fetchEvents().then((events) => {
        const slots = findFreeSlots(events);
        renderSlots(slots);
    }).catch((error) => {
        console.error("Error fetching events:", error);
    });
});

async function fetchEvents() {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59);

        const response = await gapi.client.calendar.events.list({
            calendarId: "primary",
            timeMin: today.toISOString(),
            timeMax: tomorrow.toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: "startTime",
        });
        return response.result.items;
    } catch (error) {
        console.error("Error fetching events:", error);
        displayError("Failed to fetch calendar events. Please try again.");
        return [];
    }
}

function findFreeSlots(events) {
    const workingHoursStart = 13;
    const workingHoursEnd = 22;
    const daySlots = Array.from({ length: workingHoursEnd - workingHoursStart }, (_, i) => i + workingHoursStart);

    const eventHours = events.map((event) => {
        const start = new Date(event.start.dateTime || event.start.date).getHours();
        const end = new Date(event.end.dateTime || event.end.date).getHours();
        return { start, end };
    });

    return daySlots.filter((hour) => !eventHours.some((event) => hour >= event.start && hour < event.end));
}


// 3. More Robust Free Slots Logic
function findFreeSlots(events) {
    const workingHoursStart = 13;
    const workingHoursEnd = 22;
    
    // Create slots in 30-minute increments
    const daySlots = [];
    for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
        daySlots.push(hour);
        daySlots.push(hour + 0.5);
    }

    const busyTimes = events.map(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const end = new Date(event.end.dateTime || event.end.date);
        return {
            start: start.getHours() + start.getMinutes() / 60,
            end: end.getHours() + end.getMinutes() / 60
        };
    });

    return daySlots.filter(slot => {
        const slotEnd = slot + 0.5;
        return !busyTimes.some(event => 
            (slot >= event.start && slot < event.end) ||
            (slotEnd > event.start && slotEnd <= event.end)
        );
    });
}

// 4. Improved Slot Rendering
function renderSlots(slots) {
    slotsList.innerHTML = "";
    if (slots.length === 0) {
        slotsList.innerHTML = "<li class='no-slots'>No free slots available for today.</li>";
        return;
    }

    slots.forEach(slot => {
        const hour = Math.floor(slot);
        const minutes = (slot % 1) * 60;
        const slotEnd = slot + 0.5;
        const endHour = Math.floor(slotEnd);
        const endMinutes = (slotEnd % 1) * 60;

        const li = document.createElement("li");
        li.className = "slot-item";
        li.textContent = `${formatTime(hour, minutes)} - ${formatTime(endHour, endMinutes)}`;
        slotsList.appendChild(li);
    });
}

// Helper function for time formatting
function formatTime(hours, minutes) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// 5. Error Display Function
function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

window.addEventListener("DOMContentLoaded", loadGapi); // Initialize GAPI when DOM is loaded

// https://docs.google.com/spreadsheets/d/1TOTEThiRKZICmUKwqnBHHmJdR5EgzE_xBxLDMxCjBxg/edit?usp=sharing

