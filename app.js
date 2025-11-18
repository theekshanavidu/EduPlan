// --- FIXED VERSION OF app.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, collection, getDocs, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// Firebase config
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

// Short helper
function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    for(const k in attrs){
        if(k==="cls") e.className=attrs[k];
        else if(k==="html") e.innerHTML=attrs[k];
        else e.setAttribute(k, attrs[k]);
    }
    if(typeof children==="string") e.textContent=children;
    else children.forEach(c => e.appendChild(typeof c==="string"?document.createTextNode(c):c));
    return e;
}

const root = document.getElementById("root");


// 🔥 FIX: ALWAYS RENDER LOGIN WHEN PAGE LOADS
document.addEventListener("DOMContentLoaded", () => {
    renderLanding();
});


// ---------------- AUTH LISTENER ----------------
onAuthStateChanged(auth, u=>{
    currentUser = u;
    if(u && u.uid===ADMIN_UID) u.displayName = "Admin";

    if(u) renderDashboard();
});


// ---------------- LANDING PAGE ----------------
function renderLanding(){
    if(!root) return;
    root.innerHTML = "";

    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"},[ el("div",{cls:"brand"},"StudyTracker") ]);
    frame.appendChild(top);

    const panel = el("div",{cls:"split-container panel"});

    const left = el("div",{cls:"left"},[
        el("h2",{},["WELCOME BACK!"]),
        el("p",{},["Login or sign up to continue."])
    ]);

    const right = el("div",{cls:"right"});

    // LOGIN FORM
    const login = el("form",{id:"login-form"});
    login.append(
        el("div",{cls:"form-field"},[
            el("label",{},["Email"]),
            el("input",{name:"email",type:"email",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Password"]),
            el("input",{name:"password",type:"password",required:true})
        ]),
        el("button",{cls:"neon-btn",type:"submit"},"Login"),
        el("div",{cls:"small-link",html:`No account? <a href="#" id="go-sign">Sign up</a>`})
    );

    // SIGNUP FORM
    const signup = el("form",{id:"signup-form",style:"display:none"});
    signup.append(
        el("div",{cls:"form-field"},[
            el("label",{},["First Name"]),
            el("input",{name:"firstName",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Last Name"]),
            el("input",{name:"lastName",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Birthday"]),
            el("input",{name:"birthday",type:"date",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["School"]),
            el("input",{name:"school",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Phone"]),
            el("input",{name:"phone",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Exam Year"]),
            el("input",{name:"examYear",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Email"]),
            el("input",{name:"email",type:"email",required:true})
        ]),
        el("div",{cls:"form-field"},[
            el("label",{},["Password"]),
            el("input",{name:"password",type:"password",required:true})
        ]),
        el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
        el("div",{cls:"small-link",html:`Have an account? <a href="#" id="go-login">Login</a>`})
    );

    right.append(login, signup);

    panel.append(left, right);
    frame.append(panel);
    root.append(frame);

    // SWITCH
    document.getElementById("go-sign").onclick = e=>{
        e.preventDefault();
        signup.style.display="block";
        login.style.display="none";
    };

    document.getElementById("go-login").onclick = e=>{
        e.preventDefault();
        signup.style.display="none";
        login.style.display="block";
    };

    // LOGIN SUBMIT
    login.onsubmit = async e=>{
        e.preventDefault();
        try{
            const f = e.target;
            await signInWithEmailAndPassword(auth,f.email.value,f.password.value);
        }catch(err){ alert(err.message); }
    };

    // SIGNUP SUBMIT
    signup.onsubmit = async e=>{
        e.preventDefault();
        const f = e.target;

        try{
            const cred = await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);

            await updateProfile(cred.user,{
                displayName: f.firstName.value+" "+f.lastName.value
            });

            await setDoc(doc(db,"users",cred.user.uid),{
                firstName:f.firstName.value,
                lastName:f.lastName.value,
                birthday:f.birthday.value,
                school:f.school.value,
                phone:f.phone.value,
                examYear:f.examYear.value,
                email:f.email.value,
                createdAt:new Date().toISOString()
            });

        }catch(err){ alert(err.message); }
    };
}


// ---------------- DASHBOARD ----------------
function renderDashboard(){
    root.innerHTML = `<div class="text-center text-xl">Logged in ✔</div>`;
}
