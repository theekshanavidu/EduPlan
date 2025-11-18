import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged,
  updateProfile, updatePassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
    apiKey: "AIzaSyDYhulc8Qz_xGfIeb1g9A6BGO2wwbrz82M",
    authDomain: "study-9c374.firebaseapp.com",
    projectId: "study-9c374",
    storageBucket: "study-9c374.appspot.com",
    messagingSenderId: "82946998504",
    appId: "1:82946998504:web:290cd36a2559846891095d"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "m1rddMA36WbVunFW3B0BzuqOwyI2";
let currentUser = null;
const root = document.getElementById("root");

// ---------------- MODE ----------------
let mode = localStorage.getItem("mode") || "dark";
document.body.classList.add(mode+"-mode");
function toggleMode(btn){
    mode = mode==="dark"?"light":"dark";
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    btn.textContent = mode==="dark"?"Light Mode":"Dark Mode";
    localStorage.setItem("mode",mode);
}

// ---------------- HELPER ----------------
function el(tag,attrs={},children=[]){
    const e=document.createElement(tag);
    for(const k in attrs){
        if(k==="cls") e.className=attrs[k];
        else if(k==="html") e.innerHTML=attrs[k];
        else e.setAttribute(k,attrs[k]);
    }
    if(typeof children==="string") e.textContent=children;
    else children.forEach(c=>e.appendChild(typeof c==="string"?document.createTextNode(c):c));
    return e;
}

// ---------------- AUTH ----------------
document.addEventListener("DOMContentLoaded", renderLanding);
onAuthStateChanged(auth,u=>{
    currentUser = u;
    if(u){
        if(u.uid===ADMIN_UID) renderAdminDashboard();
        else renderDashboard();
    }
});

// ---------------- LANDING ----------------
function renderLanding(){
    if(!root) return;
    root.innerHTML="";
    const container = el("div",{cls:"login-container"});
    const modeBtn = el("button",{cls:"neon-btn",onclick:()=>toggleMode(modeBtn)}, mode==="dark"?"Light Mode":"Dark Mode");
    container.appendChild(modeBtn);

    const login = el("form",{id:"login-form"});
    login.append(
        el("input",{name:"email",type:"email",placeholder:"Email",required:true,cls:"form-field"}),
        el("input",{name:"password",type:"password",placeholder:"Password",required:true,cls:"form-field"}),
        el("button",{cls:"neon-btn",type:"submit"},"Login"),
        el("p",{cls:"small-link"},el("a",{href:"#",id:"go-signup"},"No account? Sign up"))
    );

    const signup = el("form",{id:"signup-form",style:"display:none"});
    signup.append(
        el("input",{name:"firstName",placeholder:"First Name",required:true,cls:"form-field"}),
        el("input",{name:"lastName",placeholder:"Last Name",required:true,cls:"form-field"}),
        el("input",{name:"email",type:"email",placeholder:"Email",required:true,cls:"form-field"}),
        el("input",{name:"password",type:"password",placeholder:"Password",required:true,cls:"form-field"}),
        el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
        el("p",{cls:"small-link"},el("a",{href:"#",id:"go-login"},"Already have account? Login"))
    );

    container.append(login,signup);
    root.append(container);

    document.getElementById("go-signup").onclick = e=>{
        e.preventDefault(); login.style.display="none"; signup.style.display="block"; 
    };
    document.getElementById("go-login").onclick = e=>{
        e.preventDefault(); signup.style.display="none"; login.style.display="block";
    };

    login.onsubmit = async e=>{
        e.preventDefault();
        try{const f=e.target; await signInWithEmailAndPassword(auth,f.email.value,f.password.value);}
        catch(err){alert(err.message);}
    };

    signup.onsubmit = async e=>{
        e.preventDefault();
        try{
            const f=e.target;
            const cred = await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);
            await updateProfile(cred.user,{displayName:f.firstName.value+" "+f.lastName.value});
            await setDoc(doc(db,"users",cred.user.uid),{
                firstName:f.firstName.value,lastName:f.lastName.value,email:f.email.value,createdAt:new Date().toISOString()
            });
        }catch(err){alert(err.message);}
    };
}

// ---------------- DASHBOARD ----------------
function renderDashboard(){
    if(!root) return;
    root.innerHTML="";
    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"},[
        el("div",{cls:"brand"},"StudyTracker"),
        el("div",{cls:"flex gap-2"},[
            el("button",{cls:"neon-btn",onclick:renderProfile},"Profile"),
            el("button",{cls:"neon-btn",onclick:()=>signOut(auth).then(()=>renderLanding())},"Logout"),
            el("div",{id:"realtime-time"})
        ])
    ]);
    frame.appendChild(top);

    const dash = el("div",{cls:"dashboard"});
    frame.appendChild(dash);
    root.append(frame);

    // realtime clock
    const timeDiv = document.getElementById("realtime-time");
    function updateTime(){timeDiv.textContent=new Date().toLocaleString();}
    updateTime(); setInterval(updateTime,1000);

    // daily input
    const dateInput=el("input",{type:"date",cls:"form-field",id:"study-date"});
    const hoursInput=el("input",{type:"number",cls:"form-field",id:"study-hours",placeholder:"Hours (0-24)",min:0,max:24});
    const addBtn=el("button",{cls:"neon-btn"},"Add/Update");
    dash.append(dateInput,hoursInput,addBtn);

    addBtn.onclick=async ()=>{
        const date = dateInput.value;
        const hours = Math.min(24, Math.max(0, parseInt(hoursInput.value)||0));
        if(!date) return alert("Select a date");
        await setDoc(doc(db,"studyLogs",currentUser.uid+"_"+date),{
            userId:currentUser.uid,date:date,hours:hours,createdAt:new Date().toISOString()
        });
        alert("Saved!"); renderDashboard();
    };

    dash.append(el("canvas",{id:"weeklyChart"}),el("canvas",{id:"monthlyChart"}));
    renderCharts();
}

// ---------------- PROFILE ----------------
function renderProfile(){
    if(!root) return;
    root.innerHTML="";
    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"},[
        el("div",{cls:"brand"},"Profile"),
        el("div",{cls:"flex gap-2"},[
            el("button",{cls:"neon-btn",onclick:renderDashboard},"Back"),
            el("button",{cls:"neon-btn",onclick:()=>signOut(auth).then(()=>renderLanding())},"Logout")
        ])
    ]);
    frame.appendChild(top);
    root.append(frame);

    const prof = el("div",{cls:"dashboard"});
    frame.appendChild(prof);

    const docRef = doc(db,"users",currentUser.uid);
    getDoc(docRef).then(d=>{
        if(!d.exists()) return;
        const data=d.data();
        const firstNameInput = el("input",{value:data.firstName,cls:"form-field"});
        const lastNameInput = el("input",{value:data.lastName,cls:"form-field"});
        const emailInput = el("input",{value:data.email,cls:"form-field",disabled:true});
        const pwInput = el("input",{type:"password",cls:"form-field",placeholder:"New password"});
        const saveBtn = el("button",{cls:"neon-btn"},"Save Changes");

        prof.append(
            el("label",{},["First Name"]), firstNameInput,
            el("label",{},["Last Name"]), lastNameInput,
            el("label",{},["Email"]), emailInput,
            el("label",{},["Password"]), pwInput,
            saveBtn
        );

        saveBtn.onclick=async ()=>{
            await updateDoc(docRef,{firstName:firstNameInput.value,lastName:lastNameInput.value});
            if(pwInput.value) await updatePassword(auth.currentUser,pwInput.value);
            alert("Profile updated!"); renderDashboard();
        }
    });
}

// ---------------- ADMIN DASHBOARD ----------------
async function renderAdminDashboard(){
    if(!root) return;
    root.innerHTML="";
    const frame=el("div",{cls:"app-frame"});
    const top=el("div",{cls:"topbar"},[
        el("div",{cls:"brand"},"Admin Dashboard"),
        el("div",{cls:"flex gap-2"},[
            el("button",{cls:"neon-btn",onclick:()=>signOut(auth).then(()=>renderLanding())},"Logout")
        ])
    ]);
    frame.appendChild(top);
    const dash=el("div",{cls:"dashboard"});
    frame.appendChild(dash);
    root.append(frame);

    const usersSnap = await getDocs(collection(db,"users"));
    usersSnap.forEach(u=>{
        const udata = u.data();
        const item = el("div",{cls:"user-item"},[
            el("span",{},`${udata.firstName} ${udata.lastName} (${udata.email})`),
            el("button",{cls:"neon-btn",onclick:()=>deleteUser(u.id)},"Delete"),
        ]);
        dash.append(item);
    });
}

async function deleteUser(uid){
    if(!confirm("Delete this user?")) return;
    await deleteDoc(doc(db,"users",uid));
    const logsSnap=await getDocs(query(collection(db,"studyLogs"),where("userId","==",uid)));
    for(const log of logsSnap.docs) await deleteDoc(doc(db,"studyLogs",log.id));
    alert("Deleted!"); renderAdminDashboard();
}

// ---------------- CHARTS ----------------
async function renderCharts(){
    const q=query(collection(db,"studyLogs"),where("userId","==",currentUser.uid));
    const snapshot=await getDocs(q);
    const logs=snapshot.docs.map(d=>d.data());
    
    // Weekly: last 7 days
    const today = new Date();
    const weekDates = [];
    for(let i=6;i>=0;i--){
        const d = new Date(today); d.setDate(d.getDate()-i);
        weekDates.push(d.toISOString().split("T")[0]);
    }
    const weeklyData = weekDates.map(d=>{const l=logs.find(l=>l.date===d); return l?l.hours:0;});

    new Chart(document.getElementById("weeklyChart"),{
        type:"line",
        data:{labels:weekDates,datasets:[{label:"Hours",data:weeklyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]},
    });

    // Monthly
    const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyData = Array(12).fill(0);
    logs.forEach(l=>{
        const m = new Date(l.date).getMonth();
        monthlyData[m]+=l.hours;
    });
    new Chart(document.getElementById("monthlyChart"),{
        type:"line",
        data:{labels:monthLabels,datasets:[{label:"Hours",data:monthlyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]},
    });
}
