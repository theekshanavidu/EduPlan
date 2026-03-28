import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyALIII2FHy65LTvi4AaC6ulXCd6CCXQ2UM",
    authDomain: "time-planning-4ef59.firebaseapp.com",
    projectId: "time-planning-4ef59",
    storageBucket: "time-planning-4ef59.firebasestorage.app",
    messagingSenderId: "481313041090",
    appId: "1:481313041090:web:1292cbf4e51f71748e695b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let calendar, allTasks = [], subjects = {}, currentFilter = null, isSignupMode = false;
let loopSettings = { enabled: false, weekStartDate: null };
let selectedDate = new Date().toISOString().split('T')[0];

// --- Notification Logic ---
let notificationPermissionGranted = false;

window.retryPermission = async () => {
    location.reload(); 
};

function getNativeNotifications() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        return window.Capacitor.Plugins.LocalNotifications;
    }
    return null;
}

async function requestNotificationPermission() {
    try {
        const NativeNotifications = getNativeNotifications();
        if (NativeNotifications) {
            let permStatus = await NativeNotifications.requestPermissions();
            if (permStatus.display === 'granted') {
                notificationPermissionGranted = true;
            }
        } else {
            if ('Notification' in window) {
                let perm = Notification.permission;
                if (perm === 'default') perm = await Notification.requestPermission();
                if (perm === 'granted') notificationPermissionGranted = true;
            }
        }
    } catch (e) {
        console.error("Permission request failed", e);
    }

    if (!notificationPermissionGranted) {
        document.getElementById('permission-blocked-page').classList.remove('hidden');
        document.getElementById('permission-blocked-page').classList.add('flex');
    } else {
        document.getElementById('permission-blocked-page').classList.add('hidden');
        document.getElementById('permission-blocked-page').classList.remove('flex');
    }
    return notificationPermissionGranted; // Fix variable scope issues later naturally
}

async function scheduleLocalNotification(title, subName, startTimeStr) {
    const scheduleDate = new Date(startTimeStr);
    const timeDiff = scheduleDate.getTime() - Date.now();
    
    if (timeDiff > 0) {
        const NativeNotifications = getNativeNotifications();
        if (NativeNotifications) {
            try {
                await NativeNotifications.schedule({
                    notifications: [{
                        title: `M.Y.T: ${subName}`,
                        body: `Time to start: ${title}`,
                        id: Math.floor(Math.random() * 1000000),
                        schedule: { at: scheduleDate },
                        sound: 'default'
                    }]
                });
            } catch (e) { console.error(e); }
        } else {
            // PC / Web fallback via setTimeout
            setTimeout(() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`M.Y.T: ${subName}`, { body: `Time to start: ${title}`, icon: 'icon.png' });
                }
            }, timeDiff);
            console.log("Local browser notification scheduled.");
        }
    }
}

// --- Auth Functions ---
window.toggleAuthMode = () => {
    isSignupMode = !isSignupMode;
    document.getElementById('auth-title').innerText = isSignupMode ? "Create Account" : "Manage Your Time.";
    document.getElementById('auth-btn').innerText = isSignupMode ? "Sign Up" : "Login";
    document.getElementById('auth-toggle-btn').innerText = isSignupMode ? "Login" : "Sign Up";
};

window.handleAuth = async () => {
    const e = document.getElementById('email').value.trim();
    const p = document.getElementById('password').value;
    if(!e || !p) return alert("Please enter email and password.");
    
    try {
        if(isSignupMode) {
            await createUserWithEmailAndPassword(auth, e, p);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
            await signInWithEmailAndPassword(auth, e, p);
        }
    } catch (err) {
        alert(err.message);
    }
};

window.forgotPassword = async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) return alert("Please type your email address first.");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent! Check your inbox.");
    } catch (error) {
        alert(error.message);
    }
};

window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
        alert(err.message);
    }
}

window.logout = () => signOut(auth);

// --- App Functions ---
window.openSidebar = () => { 
    document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('sidebar-overlay').classList.add('show'); 
};
window.closeSidebar = () => { 
    document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('sidebar-overlay').classList.remove('show'); 
};

window.showWorkspace = () => {
    document.getElementById('left-panels').classList.remove('hidden');
    document.getElementById('right-calendar').classList.remove('lg:col-span-12');
    document.getElementById('right-calendar').classList.add('lg:col-span-8');
    document.body.classList.remove('timetable-mode');
    document.getElementById('main-title').innerText = "Workspace";
    
    document.getElementById('nav-workspace').classList.add('bg-violet-600', 'text-white');
    document.getElementById('nav-workspace').classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500', 'dark:text-slate-400');
    
    document.getElementById('nav-timetable').classList.remove('bg-violet-600', 'text-white');
    document.getElementById('nav-timetable').classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500', 'dark:text-slate-400');
    
    if (calendar) {
        calendar.setOption('slotDuration', '00:30:00');
        setTimeout(() => calendar.updateSize(), 50);
    }
};

window.showTimetable = () => {
    document.getElementById('left-panels').classList.add('hidden');
    document.getElementById('right-calendar').classList.remove('lg:col-span-8');
    document.getElementById('right-calendar').classList.add('lg:col-span-12');
    document.body.classList.add('timetable-mode');
    document.getElementById('main-title').innerText = "Timetable";
    
    document.getElementById('nav-timetable').classList.add('bg-violet-600', 'text-white');
    document.getElementById('nav-timetable').classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500', 'dark:text-slate-400');
    
    document.getElementById('nav-workspace').classList.remove('bg-violet-600', 'text-white');
    document.getElementById('nav-workspace').classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500', 'dark:text-slate-400');
    
    if (calendar) {
        calendar.setOption('slotDuration', '01:00:00');
        setTimeout(() => calendar.updateSize(), 50);
    }
};


window.addSubject = async () => {
    const name = document.getElementById('newSubName').value.trim();
    const color = document.getElementById('newSubColor').value;
    if(!name) return;
    
    if (window.editingSubjectName) {
        // If name changed, delete old category document
        if (window.editingSubjectName !== name) {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "subjects", window.editingSubjectName));
        }
        
        // Save new category document
        await setDoc(doc(db, "users", auth.currentUser.uid, "subjects", name), { name, color });
        
        // Update all related tasks to the new name and color
        const tasksQuery = query(collection(db, "tasks"), where("uid", "==", auth.currentUser.uid), where("subName", "==", window.editingSubjectName));
        const snap = await getDocs(tasksQuery);
        snap.forEach(d => {
            updateDoc(doc(db, "tasks", d.id), { subName: name, backgroundColor: color });
        });
        
        // Reset Edit State
        window.editingSubjectName = null;
        document.querySelector('.order-subject h3').innerHTML = `<i class="fas fa-folder-plus text-violet-500"></i> New Category`;
    } else {
        await setDoc(doc(db, "users", auth.currentUser.uid, "subjects", name), { name, color });
    }
    
    document.getElementById('newSubName').value = "";
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.8 } });
};

window.toggleGlobalLoop = async () => {
    const isChecked = document.getElementById('globalLoopToggle').checked;
    const uid = auth.currentUser.uid;
    const dbRef = doc(db, "users", uid);
    
    if (isChecked) {
        const now = new Date();
        const day = now.getDay() || 7; 
        now.setHours(0,0,0,0);
        const monday = new Date(now.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
        const startDateStr = monday.toISOString().split('T')[0];
        
        await setDoc(dbRef, { loopSettings: { enabled: true, weekStartDate: startDateStr } }, { merge: true });
    } else {
        await setDoc(dbRef, { loopSettings: { enabled: false, weekStartDate: null } }, { merge: true });
    }
};

window.editSubject = (oldName, oldColor) => {
    document.getElementById('newSubName').value = oldName;
    document.getElementById('newSubColor').value = oldColor;
    window.editingSubjectName = oldName;
    
    document.querySelector('.order-subject h3').innerHTML = `<i class="fas fa-edit text-blue-500"></i> Edit Category`;
    document.getElementById('newSubName').focus();
    if(window.innerWidth < 1024) window.closeSidebar();
};

window.deleteSubject = async (name) => {
    if(confirm(`Are you sure you want to completely delete the category '${name}'?\nThis will also delete ALL tasks scheduled under it!`)) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "subjects", name));
        
        // Delete all associated tasks
        const tasksQuery = query(collection(db, "tasks"), where("uid", "==", auth.currentUser.uid), where("subName", "==", name));
        const snap = await getDocs(tasksQuery);
        snap.forEach(d => {
            deleteDoc(doc(db, "tasks", d.id));
        });
        
        if (currentFilter === name) {
            currentFilter = null;
            renderView();
        }
    }
};

window.saveTask = async () => {
    const title = document.getElementById('taskTitle').value;
    const sub = document.getElementById('taskSubject').value;
    const date = document.getElementById('taskDate').value;
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const color = document.getElementById('taskColor').value;
    
    if(!title || !date || !sub || !start || !end) return alert("Please fill all required fields.");
    
    const startFull = `${date}T${start}`;
    const endFull = `${date}T${end}`;
    
    await addDoc(collection(db, "tasks"), { 
        uid: auth.currentUser.uid, 
        subName: sub, 
        title, 
        date, 
        start: startFull, 
        end: endFull, 
        backgroundColor: color, 
        completed: false
    });
    
    scheduleLocalNotification(title, sub, startFull);
    document.getElementById('taskTitle').value = "";
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.9 } });
};

function syncSubjects(uid) {
    onSnapshot(collection(db, "users", uid, "subjects"), (snap) => {
        const select = document.getElementById('taskSubject');
        const sidebar = document.getElementById('sidebar-subject-list');
        select.innerHTML = '<option value="">Select Category</option>'; 
        sidebar.innerHTML = '';
        
        snap.forEach(doc => {
            const sub = doc.data(); 
            subjects[sub.name] = sub.color;
            select.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
            sidebar.innerHTML += `
                <div class="group flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" id="filter-${sub.name}">
                    <div onclick="window.filterBySubject('${sub.name}'); window.closeSidebar()" class="flex-grow flex items-center gap-4 font-bold text-slate-500 dark:text-slate-400 text-sm p-2">
                        <span class="w-3 h-3 rounded-full shadow-sm" style="background:${sub.color}"></span> ${sub.name}
                    </div>
                    <div class="flex gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2 text-slate-400">
                        <button onclick="window.editSubject('${sub.name}', '${sub.color}'); event.stopPropagation();" class="hover:text-blue-500 p-1"><i class="fas fa-edit text-xs"></i></button>
                        <button onclick="window.deleteSubject('${sub.name}'); event.stopPropagation();" class="hover:text-red-500 p-1"><i class="fas fa-trash-alt text-xs"></i></button>
                    </div>
                </div>`;
        });
    });
}

function loadTasks(uid) {
    onSnapshot(query(collection(db, "tasks"), where("uid", "==", uid)), (snap) => {
        allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allTasks.forEach(t => { 
            if(!t.completed) scheduleLocalNotification(t.title, t.subName, t.start); 
        });
        renderView();
    });
}

function renderView() {
    let filtered = currentFilter ? allTasks.filter(t => t.subName === currentFilter) : allTasks;
    if(calendar) { calendar.removeAllEvents(); }
    
    let weekStartMs = 0;
    let weekEndMs = 0;
    if (loopSettings.enabled && loopSettings.weekStartDate) {
        const [y, m, d] = loopSettings.weekStartDate.split('-');
        weekStartMs = new Date(y, m - 1, d).getTime();
        weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
    }
    
    const events = filtered.map(t => {
        let ev = { 
            id: t.id, 
            title: t.subName + ": " + t.title + (t.completed ? " ✓" : ""), 
            backgroundColor: t.completed ? "#94a3b8" : t.backgroundColor, 
            borderColor: t.completed ? "transparent" : t.backgroundColor,
            textColor: '#fff',
            classNames: t.completed ? ['event-completed'] : []
        };
        
        const [ty, tm, td] = t.date.split('-');
        const taskMs = new Date(ty, tm - 1, td).getTime();
        
        if (loopSettings.enabled && taskMs >= weekStartMs && taskMs < weekEndMs) {
            ev.startTime = t.start.split('T')[1];
            ev.endTime = t.end.split('T')[1];
            ev.daysOfWeek = [new Date(ty, tm - 1, td).getDay()];
            ev.startRecur = loopSettings.weekStartDate;
        } else {
            ev.start = t.start;
            ev.end = t.end;
        }
        
        return ev;
    });
    
    if(calendar) calendar.addEventSource(events);
    updateAgenda();
}

function updateAgenda() {
    const list = document.getElementById('daily-tasks-list');
    const displayDate = new Date(selectedDate);
    
    document.getElementById('agenda-date-label').innerText = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('selected-day-badge').innerText = displayDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    let weekStartMs = 0;
    let weekEndMs = 0;
    if (loopSettings.enabled && loopSettings.weekStartDate) {
        const [wy, wm, wd] = loopSettings.weekStartDate.split('-');
        weekStartMs = new Date(wy, wm - 1, wd).getTime();
        weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
    }
    
    let dayTasks = allTasks.filter(t => {
        if (t.date === selectedDate) return true;
        
        const [ty, tm, td] = t.date.split('-');
        const taskMs = new Date(ty, tm - 1, td).getTime();
        
        if (loopSettings.enabled && taskMs >= weekStartMs && taskMs < weekEndMs) {
            const [sy, sm, sd] = selectedDate.split('-');
            let selectedTime = new Date(sy, sm - 1, sd).getTime();
            
            if (new Date(sy, sm - 1, sd).getDay() === new Date(ty, tm - 1, td).getDay() && selectedTime >= weekStartMs) {
                return true;
            }
        }
        return false;
    });
    
    if(currentFilter) dayTasks = dayTasks.filter(t => t.subName === currentFilter);
    dayTasks.sort((a,b) => a.start.split('T')[1].localeCompare(b.start.split('T')[1]));
    
    list.innerHTML = dayTasks.length ? "" : "<div class='text-center py-10 opacity-30 text-xs italic uppercase tracking-widest text-slate-100'>No Plans Scheduled</div>";
    
    dayTasks.forEach(t => {
        const div = document.createElement('div');
        div.className = `p-4 flex flex-col gap-3 rounded-[28px] border-l-[6px] transition-all hover:scale-[1.02] ${t.completed ? 'bg-slate-800/50 backdrop-blur opacity-70' : 'bg-white text-slate-900 shadow-xl'}`;
        div.style.borderColor = t.completed ? "#94a3b8" : t.backgroundColor;
        
        div.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-4">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="window.toggleComplete('${t.id}', ${t.completed})" class="w-6 h-6 accent-green-500 cursor-pointer">
                    <div>
                        <p class="font-bold text-sm ${t.completed ? 'line-through text-slate-300' : 'text-slate-800'}">${t.subName}: ${t.title}</p>
                        <p class="text-[11px] font-black text-violet-500">${t.start.split('T')[1]} - ${t.end.split('T')[1]}</p>
                    </div>
                </div>
                <button onclick="window.deleteTask('${t.id}')" class="text-slate-300 hover:text-red-500 p-2"><i class="fas fa-trash-alt text-sm"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.toggleComplete = async (id, status) => { 
    if(!status) confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } }); 
    await updateDoc(doc(db, "tasks", id), { completed: !status }); 
};

window.deleteTask = async (id) => { 
    if(confirm("Are you sure you want to delete this task?")) {
        await deleteDoc(doc(db, "tasks", id)); 
    }
};

window.toggleDarkMode = () => { 
    const isDark = document.documentElement.classList.toggle('dark'); 
    document.getElementById('theme-icon').className = isDark ? 'fas fa-sun text-amber-400' : 'fas fa-moon text-violet-500'; 
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

window.filterBySubject = (name) => { currentFilter = name; renderView(); };
window.applySubjectColor = () => { 
    const sub = document.getElementById('taskSubject').value; 
    document.getElementById('taskColor').value = subjects[sub] || "#8b5cf6"; 
};

// Check saved theme
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

onAuthStateChanged(auth, async user => {
    if (user) {
        document.getElementById('auth-page').classList.add('hidden');
        
        // Request Permissions strictly
        let granted = await requestNotificationPermission();
        if(!granted) return; // UI is locked via ID

        document.getElementById('app-content').classList.remove('hidden');
        
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().loopSettings) {
                loopSettings = docSnap.data().loopSettings;
            } else {
                loopSettings = { enabled: false, weekStartDate: null };
            }
            if(document.getElementById('globalLoopToggle')) {
                document.getElementById('globalLoopToggle').checked = loopSettings.enabled;
            }
            renderView();
        });
        
        // Setup Date inputs to today
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('taskDate').value = localDate;
        document.getElementById('date-display').innerText = now.toDateString();
        
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
            initialView: 'timeGridWeek',
            headerToolbar: { 
                left: 'prev,next today', 
                center: 'title', 
                right: 'timeGridWeek,timeGridDay' 
            },
            slotMinTime: '00:00:00', 
            slotMaxTime: '24:00:00', 
            allDaySlot: false, 
            height: '100%',
            expandRows: true,
            stickyHeaderDates: true,
            nowIndicator: true,
            visibleRange: function(currentDate) {
                var start = new Date(currentDate.valueOf());
                start.setDate(start.getDate() - 1);
                var end = new Date(start.valueOf());
                end.setDate(end.getDate() + 8); // 8 Days total (Yest + Today + 6 Future = 8 columns) Wait, +8 means up to end.
                return { start: start, end: end };
            },
            dateClick: info => { 
                selectedDate = info.dateStr.split('T')[0]; 
                document.getElementById('taskDate').value = selectedDate;
                updateAgenda(); 
            },
            eventClick: info => {
                // Clicking an event toggles its complete status
                let isCompleted = info.event.classNames.includes('event-completed');
                window.toggleComplete(info.event.id, isCompleted);
            }
        });
        
        calendar.render(); 
        syncSubjects(user.uid); 
        loadTasks(user.uid);
    } else { 
        document.getElementById('auth-page').classList.remove('hidden'); 
        document.getElementById('app-content').classList.add('hidden'); 
    }
});
